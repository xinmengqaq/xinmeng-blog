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
from app.main import app
from app.modules.auth.dependencies import get_current_admin
from app.modules.file.models import SiteConfig
from app.modules.file.storage.dependencies import get_site_background_storage
from app.modules.file.storage.local_disk import LocalStorage

TEST_URL = settings.database_url.replace("springboot_vue", "springboot_vue_test")

test_engine = create_async_engine(TEST_URL, echo=False, poolclass=NullPool)
test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _skip_auth():
    # 业务测试跳过鉴权；鉴权由 test_file_auth 覆盖
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


async def _insert_site_config(background_url: str | None = None) -> int:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            result = await session.execute(
                text(
                    "INSERT INTO site_config (background_url) "
                    "VALUES (:background_url) RETURNING id"
                ),
                {"background_url": background_url},
            )
            site_id = result.scalar_one()
            await session.commit()
            return site_id
    finally:
        await engine.dispose()


async def _get_background_url(site_id: int) -> str | None:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            stmt = select(SiteConfig.background_url).where(SiteConfig.id == site_id)
            return (await session.execute(stmt)).scalar_one_or_none()
    finally:
        await engine.dispose()


async def _delete_site_config(site_id: int) -> None:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            await session.execute(
                text("DELETE FROM site_config WHERE id = :id"),
                {"id": site_id},
            )
            await session.commit()
    finally:
        await engine.dispose()


async def _clear_all_site_config() -> None:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            await session.execute(text("DELETE FROM site_config"))
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
        base_dir=str(tmp_path / "site" / "background"),
        base_url="/files/site/background",
    )
    app.dependency_overrides[get_site_background_storage] = lambda: storage
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


def test_upload_background_success(tmp_path):
    asyncio.run(_clear_all_site_config())
    site_id = asyncio.run(_insert_site_config())
    _override_session()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/site-config/background",
            files={"file": ("background.png", content, "image/png")},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "200"
        assert body["message"] == "请求成功"
        assert body["data"]["file_url"].endswith(".png")

        background_url = asyncio.run(_get_background_url(site_id))
        assert background_url == body["data"]["file_url"]

        filename = background_url.rsplit("/", 1)[-1]
        assert (tmp_path / "site" / "background" / filename).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_site_config(site_id))


def test_upload_background_accepts_webp(tmp_path):
    asyncio.run(_clear_all_site_config())
    site_id = asyncio.run(_insert_site_config())
    _override_session()
    _override_storage(tmp_path)
    try:
        response = client.put(
            "/api/admin/files/site-config/background",
            files={"file": ("background.webp", _make_webp_bytes(), "image/webp")},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "200"
        assert body["data"]["file_url"].endswith(".webp")
        assert asyncio.run(_get_background_url(site_id)) == body["data"]["file_url"]
        stored_name = body["data"]["file_url"].rsplit("/", 1)[-1]
        assert (tmp_path / "site" / "background" / stored_name).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_site_config(site_id))


def test_upload_background_rejects_gif(tmp_path):
    asyncio.run(_clear_all_site_config())
    site_id = asyncio.run(_insert_site_config())
    _override_session()
    _override_storage(tmp_path)
    try:
        response = client.put(
            "/api/admin/files/site-config/background",
            files={"file": ("background.gif", _make_gif_bytes(), "image/gif")},
        )

        assert response.status_code == 400
        body = response.json()
        assert body["code"] == "400"
        assert body["message"] == "文件类型不允许"
        assert asyncio.run(_get_background_url(site_id)) is None
        background_dir = tmp_path / "site" / "background"
        assert not background_dir.exists() or not list(background_dir.glob("*"))
    finally:
        _clear_overrides()
        asyncio.run(_delete_site_config(site_id))


def test_upload_background_site_config_not_found(tmp_path):
    asyncio.run(_clear_all_site_config())
    _override_session()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/site-config/background",
            files={"file": ("background.png", content, "image/png")},
        )
        assert response.status_code == 404
        body = response.json()
        assert body["code"] == "404"
        assert body["message"] == "站点配置不存在"
        assert body["data"] is None

        background_dir = tmp_path / "site" / "background"
        if background_dir.exists():
            assert not list(background_dir.glob("*"))
    finally:
        _clear_overrides()


def test_upload_background_db_failure_cleans_new_file(tmp_path):
    asyncio.run(_clear_all_site_config())
    site_id = asyncio.run(_insert_site_config())
    _override_session_commit_to_fail()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/site-config/background",
            files={"file": ("background.png", content, "image/png")},
        )
        assert response.status_code == 500
        body = response.json()
        assert body["code"] == "500"
        assert body["message"] == "系统异常"
        assert body["data"] is None

        background_dir = tmp_path / "site" / "background"
        if background_dir.exists():
            assert not list(background_dir.glob("*"))
    finally:
        _clear_overrides()
        asyncio.run(_delete_site_config(site_id))


def test_upload_background_replaces_old_file(tmp_path):
    asyncio.run(_clear_all_site_config())
    old_storage = LocalStorage(
        base_dir=str(tmp_path / "site" / "background"),
        base_url="/files/site/background",
    )
    old_url = asyncio.run(old_storage.save(b"old background", "old-20260725-00000001.png"))
    site_id = asyncio.run(_insert_site_config(background_url=old_url))

    _override_session()
    _override_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/site-config/background",
            files={"file": ("background.png", content, "image/png")},
        )
        assert response.status_code == 200
        new_url = response.json()["data"]["file_url"]

        assert asyncio.run(_get_background_url(site_id)) == new_url

        old_filename = old_url.rsplit("/", 1)[-1]
        new_filename = new_url.rsplit("/", 1)[-1]
        assert not (tmp_path / "site" / "background" / old_filename).exists()
        assert (tmp_path / "site" / "background" / new_filename).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_site_config(site_id))


def test_remove_background_clears_database_url_and_old_file(tmp_path):
    asyncio.run(_clear_all_site_config())
    storage = LocalStorage(
        base_dir=str(tmp_path / "site" / "background"),
        base_url="/files/site/background",
    )
    old_url = asyncio.run(storage.save(b"old background", "old-20260729-00000001.png"))
    site_id = asyncio.run(_insert_site_config(background_url=old_url))
    _override_session()
    _override_storage(tmp_path)
    try:
        response = client.delete("/api/admin/files/site-config/background")

        assert response.status_code == 200
        assert response.json() == {
            "code": "200",
            "message": "请求成功",
            "data": None,
        }
        assert asyncio.run(_get_background_url(site_id)) is None
        assert not (tmp_path / "site" / "background" / old_url.rsplit("/", 1)[-1]).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_site_config(site_id))
