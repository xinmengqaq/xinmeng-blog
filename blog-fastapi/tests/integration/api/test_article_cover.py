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
from app.modules.file.models import Article
from app.modules.file.storage.dependencies import get_article_cover_storage
from app.modules.file.storage.local_disk import LocalStorage
from app.main import app

TEST_URL = settings.database_url.replace("springboot_vue", "springboot_vue_test")

# TestClient 用的引擎：NullPool 不复用连接，避免跨测试/跨事件循环连接状态污染
test_engine = create_async_engine(TEST_URL, echo=False, poolclass=NullPool)
test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _skip_auth():
    # 文件业务测试跳过鉴权（鉴权在 test_auth.py 已测）
    # 不跳过的话所有测试都被 401 挡住，测不到文件业务
    async def _override() -> int:
        return 1
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
async def _insert_article(cover_url: str | None = None) -> int:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            # id 是 GENERATED ALWAYS 身份列，不能手动插入，用 RETURNING 拿自增值
            result = await session.execute(
                text(
                    "INSERT INTO article (title, content, status, cover_url, "
                    "created_at, updated_at) "
                    "VALUES ('test', 'test', 'draft', :cover_url, now(), now()) "
                    "RETURNING id"
                ),
                {"cover_url": cover_url},
            )
            article_id = result.scalar()
            await session.commit()
            return article_id
    finally:
        await engine.dispose()


async def _get_cover_url(article_id: int) -> str | None:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            stmt = select(Article.cover_url).where(Article.id == article_id)
            return (await session.execute(stmt)).scalar_one_or_none()
    finally:
        await engine.dispose()


async def _delete_article(article_id: int) -> None:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            await session.execute(text("DELETE FROM article WHERE id = :id"), {"id": article_id})
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
        base_dir=str(tmp_path / "articles" / "cover"),
        base_url="/files/articles/cover",
    )
    app.dependency_overrides[get_article_cover_storage] = lambda: storage
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


def test_upload_cover_success(tmp_path):
    article_id = asyncio.run(_insert_article())
    _override_session()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            f"/api/admin/files/articles/{article_id}/cover",
            files={"file": ("cover.png", content, "image/png")},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "200"
        assert body["message"] == "请求成功"
        assert body["data"]["file_url"].endswith(".png")

        cover_url = asyncio.run(_get_cover_url(article_id))
        assert cover_url == body["data"]["file_url"]

        filename = cover_url.rsplit("/", 1)[-1]
        assert (tmp_path / "articles" / "cover" / filename).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_article(article_id))


def test_upload_cover_accepts_webp(tmp_path):
    article_id = asyncio.run(_insert_article())
    _override_session()
    _override_storage(tmp_path)
    try:
        response = client.put(
            f"/api/admin/files/articles/{article_id}/cover",
            files={"file": ("cover.webp", _make_webp_bytes(), "image/webp")},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "200"
        assert body["data"]["file_url"].endswith(".webp")
        assert asyncio.run(_get_cover_url(article_id)) == body["data"]["file_url"]
        stored_name = body["data"]["file_url"].rsplit("/", 1)[-1]
        assert (tmp_path / "articles" / "cover" / stored_name).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_article(article_id))


def test_upload_cover_rejects_gif(tmp_path):
    article_id = asyncio.run(_insert_article())
    _override_session()
    _override_storage(tmp_path)
    try:
        response = client.put(
            f"/api/admin/files/articles/{article_id}/cover",
            files={"file": ("cover.gif", _make_gif_bytes(), "image/gif")},
        )

        assert response.status_code == 400
        body = response.json()
        assert body["code"] == "400"
        assert body["message"] == "文件类型不允许"
        assert asyncio.run(_get_cover_url(article_id)) is None
        cover_dir = tmp_path / "articles" / "cover"
        assert not cover_dir.exists() or not list(cover_dir.glob("*"))
    finally:
        _clear_overrides()
        asyncio.run(_delete_article(article_id))


def test_upload_cover_article_not_found(tmp_path):
    _override_session()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/articles/99999/cover",
            files={"file": ("cover.png", content, "image/png")},
        )
        assert response.status_code == 404
        body = response.json()
        assert body["code"] == "404"
        assert body["message"] == "文章不存在"
        assert body["data"] is None

        cover_dir = tmp_path / "articles" / "cover"
        if cover_dir.exists():
            assert not list(cover_dir.glob("*"))
    finally:
        _clear_overrides()


def test_upload_cover_db_failure_cleans_new_file(tmp_path):
    article_id = asyncio.run(_insert_article())
    _override_session_commit_to_fail()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            f"/api/admin/files/articles/{article_id}/cover",
            files={"file": ("cover.png", content, "image/png")},
        )
        assert response.status_code == 500
        body = response.json()
        assert body["code"] == "500"
        assert body["message"] == "系统异常"
        assert body["data"] is None

        cover_dir = tmp_path / "articles" / "cover"
        if cover_dir.exists():
            assert not list(cover_dir.glob("*"))
    finally:
        _clear_overrides()
        asyncio.run(_delete_article(article_id))


def test_upload_cover_replaces_old_file(tmp_path):
    old_storage = LocalStorage(
        base_dir=str(tmp_path / "articles" / "cover"),
        base_url="/files/articles/cover",
    )
    old_url = asyncio.run(old_storage.save(b"old cover", "old-20260725-00000001.png"))
    article_id = asyncio.run(_insert_article(cover_url=old_url))

    _override_session()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            f"/api/admin/files/articles/{article_id}/cover",
            files={"file": ("cover.png", content, "image/png")},
        )
        assert response.status_code == 200
        new_url = response.json()["data"]["file_url"]

        assert asyncio.run(_get_cover_url(article_id)) == new_url

        old_filename = old_url.rsplit("/", 1)[-1]
        new_filename = new_url.rsplit("/", 1)[-1]
        assert not (tmp_path / "articles" / "cover" / old_filename).exists()
        assert (tmp_path / "articles" / "cover" / new_filename).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_article(article_id))


def test_remove_cover_clears_database_url_and_old_file(tmp_path):
    storage = LocalStorage(
        base_dir=str(tmp_path / "articles" / "cover"),
        base_url="/files/articles/cover",
    )
    old_url = asyncio.run(storage.save(b"old cover", "old-20260729-00000001.png"))
    article_id = asyncio.run(_insert_article(cover_url=old_url))
    _override_session()
    _override_storage(tmp_path)
    try:
        response = client.delete(f"/api/admin/files/articles/{article_id}/cover")

        assert response.status_code == 200
        assert response.json() == {
            "code": "200",
            "message": "请求成功",
            "data": None,
        }
        assert asyncio.run(_get_cover_url(article_id)) is None
        assert not (tmp_path / "articles" / "cover" / old_url.rsplit("/", 1)[-1]).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_article(article_id))
