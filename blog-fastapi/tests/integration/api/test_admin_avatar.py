import asyncio
import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.db.session import get_db_session
from app.modules.auth.dependencies import get_current_admin
from app.modules.auth.models import Admin
from app.modules.file.storage.dependencies import get_admin_avatar_storage
from app.modules.file.storage.local_disk import LocalStorage
from app.main import app

TEST_URL = settings.database_url.replace("springboot_vue", "springboot_vue_test")

# TestClient 用的引擎：NullPool 不复用连接，避免跨测试/跨事件循环连接状态污染
test_engine = create_async_engine(TEST_URL, echo=False, poolclass=NullPool)
test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

client = TestClient(app, raise_server_exceptions=False)

# 头像测试用固定的测试管理员 ID，避免影响真实管理员（id=1）
TEST_ADMIN_ID = 999001


@pytest.fixture(autouse=True)
def _skip_auth():
    # 文件业务测试跳过鉴权（鉴权在 test_auth.py 已测）
    # 不跳过的话所有测试都被 401 挡住，测不到文件业务
    # 返回 TEST_ADMIN_ID，让 service 更新测试管理员，而不是真实管理员
    async def _override() -> int:
        return TEST_ADMIN_ID
    app.dependency_overrides[get_current_admin] = _override
    yield
    app.dependency_overrides.pop(get_current_admin, None)


def _make_png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="PNG")
    return buf.getvalue()


def _make_webp_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="WEBP")
    return buf.getvalue()


def _make_gif_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="GIF")
    return buf.getvalue()


# 每个辅助函数用独立引擎：asyncio.run 每次新建事件循环，模块级引擎的连接会跨循环复用报错。
# 独立引擎在函数内创建并销毁，连接不跨循环。
async def _insert_admin(admin_id: int, avatar: str | None = None) -> None:
    # admin.id 是 IDENTITY BY DEFAULT（不是 ALWAYS），可以手动指定 id
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            await session.execute(
                text(
                    "INSERT INTO admin (id, username, password, password_version, avatar) "
                    "VALUES (:id, :username, :password, 1, :avatar)"
                ),
                {
                    "id": admin_id,
                    "username": "test_avatar_admin",
                    "password": "test",
                    "avatar": avatar,
                },
            )
            await session.commit()
    finally:
        await engine.dispose()


async def _get_avatar(admin_id: int) -> str | None:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            stmt = select(Admin.avatar).where(Admin.id == admin_id)
            return (await session.execute(stmt)).scalar_one_or_none()
    finally:
        await engine.dispose()


async def _delete_admin(admin_id: int) -> None:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            await session.execute(text("DELETE FROM admin WHERE id = :id"), {"id": admin_id})
            await session.commit()
    finally:
        await engine.dispose()


def _override_session() -> None:
    async def _override():
        async with test_session_factory() as session:
            yield session
    app.dependency_overrides[get_db_session] = _override


def _override_storage(tmp_path: Path) -> LocalStorage:
    storage = LocalStorage(
        base_dir=str(tmp_path / "admins" / "avatar"),
        base_url="/files/admins/avatar",
    )
    app.dependency_overrides[get_admin_avatar_storage] = lambda: storage
    return storage


def _override_session_commit_to_fail() -> None:
    async def _override():
        async with test_session_factory() as session:
            async def _fail_commit(*args, **kwargs):
                raise SQLAlchemyError("test commit failure")
            session.commit = _fail_commit
            yield session
    app.dependency_overrides[get_db_session] = _override


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


def test_upload_avatar_success(tmp_path):
    # 正常上传：admin.avatar 被更新，磁盘有文件
    asyncio.run(_insert_admin(TEST_ADMIN_ID))
    _override_session()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/profile/avatar",
            files={"file": ("avatar.png", content, "image/png")},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "200"
        assert body["message"] == "请求成功"
        assert body["data"]["file_url"].endswith(".png")

        avatar_url = asyncio.run(_get_avatar(TEST_ADMIN_ID))
        assert avatar_url == body["data"]["file_url"]

        filename = avatar_url.rsplit("/", 1)[-1]
        assert (tmp_path / "admins" / "avatar" / filename).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_admin(TEST_ADMIN_ID))


def test_upload_avatar_accepts_webp(tmp_path):
    asyncio.run(_insert_admin(TEST_ADMIN_ID))
    _override_session()
    _override_storage(tmp_path)
    try:
        response = client.put(
            "/api/admin/files/profile/avatar",
            files={"file": ("avatar.webp", _make_webp_bytes(), "image/webp")},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "200"
        assert body["data"]["file_url"].endswith(".webp")
        assert asyncio.run(_get_avatar(TEST_ADMIN_ID)) == body["data"]["file_url"]
        stored_name = body["data"]["file_url"].rsplit("/", 1)[-1]
        assert (tmp_path / "admins" / "avatar" / stored_name).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_admin(TEST_ADMIN_ID))


def test_upload_avatar_rejects_gif(tmp_path):
    asyncio.run(_insert_admin(TEST_ADMIN_ID))
    _override_session()
    _override_storage(tmp_path)
    try:
        response = client.put(
            "/api/admin/files/profile/avatar",
            files={"file": ("avatar.gif", _make_gif_bytes(), "image/gif")},
        )

        assert response.status_code == 400
        body = response.json()
        assert body["code"] == "400"
        assert body["message"] == "文件类型不允许"
        assert asyncio.run(_get_avatar(TEST_ADMIN_ID)) is None
        avatar_dir = tmp_path / "admins" / "avatar"
        assert not avatar_dir.exists() or not list(avatar_dir.glob("*"))
    finally:
        _clear_overrides()
        asyncio.run(_delete_admin(TEST_ADMIN_ID))


def test_upload_avatar_admin_not_found(tmp_path):
    # 管理员不存在（_skip_auth 返回 TEST_ADMIN_ID，但不插入该管理员）-> 404 + 不写盘
    _override_session()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/profile/avatar",
            files={"file": ("avatar.png", content, "image/png")},
        )
        assert response.status_code == 404
        body = response.json()
        assert body["code"] == "404"
        assert body["message"] == "管理员不存在"
        assert body["data"] is None

        avatar_dir = tmp_path / "admins" / "avatar"
        if avatar_dir.exists():
            assert not list(avatar_dir.glob("*"))
    finally:
        _clear_overrides()


def test_upload_avatar_db_failure_cleans_new_file(tmp_path):
    # commit 失败 -> 500 + 新文件被清掉
    asyncio.run(_insert_admin(TEST_ADMIN_ID))
    _override_session_commit_to_fail()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/profile/avatar",
            files={"file": ("avatar.png", content, "image/png")},
        )
        assert response.status_code == 500
        body = response.json()
        assert body["code"] == "500"
        assert body["message"] == "系统异常"
        assert body["data"] is None

        avatar_dir = tmp_path / "admins" / "avatar"
        if avatar_dir.exists():
            assert not list(avatar_dir.glob("*"))
    finally:
        _clear_overrides()
        asyncio.run(_delete_admin(TEST_ADMIN_ID))


def test_upload_avatar_replaces_old_file(tmp_path):
    # 替换：先有旧头像文件 -> 传新图 -> DB 变新地址、旧文件被删、新文件在
    old_storage = LocalStorage(
        base_dir=str(tmp_path / "admins" / "avatar"),
        base_url="/files/admins/avatar",
    )
    old_url = asyncio.run(old_storage.save(b"old avatar", "old-20260725-00000001.png"))
    asyncio.run(_insert_admin(TEST_ADMIN_ID, avatar=old_url))

    _override_session()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/profile/avatar",
            files={"file": ("avatar.png", content, "image/png")},
        )
        assert response.status_code == 200
        new_url = response.json()["data"]["file_url"]

        assert asyncio.run(_get_avatar(TEST_ADMIN_ID)) == new_url

        old_filename = old_url.rsplit("/", 1)[-1]
        new_filename = new_url.rsplit("/", 1)[-1]
        assert not (tmp_path / "admins" / "avatar" / old_filename).exists()
        assert (tmp_path / "admins" / "avatar" / new_filename).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_admin(TEST_ADMIN_ID))


def test_remove_avatar_clears_database_url_and_old_file(tmp_path):
    storage = LocalStorage(
        base_dir=str(tmp_path / "admins" / "avatar"),
        base_url="/files/admins/avatar",
    )
    old_url = asyncio.run(storage.save(b"old avatar", "old-20260729-00000001.png"))
    asyncio.run(_insert_admin(TEST_ADMIN_ID, avatar=old_url))
    _override_session()
    _override_storage(tmp_path)
    try:
        response = client.delete("/api/admin/files/profile/avatar")

        assert response.status_code == 200
        assert response.json() == {
            "code": "200",
            "message": "请求成功",
            "data": None,
        }
        assert asyncio.run(_get_avatar(TEST_ADMIN_ID)) is None
        assert not (tmp_path / "admins" / "avatar" / old_url.rsplit("/", 1)[-1]).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_admin(TEST_ADMIN_ID))
