import io
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.db.session import get_db_session
from app.main import app
from app.modules.file.storage.dependencies import (
    get_article_cover_storage,
    get_site_background_storage,
    get_storage_backend,
)
from app.modules.file.storage.local_disk import LocalStorage

# 这个文件专测文件接口的鉴权保护（不带 token / 错误 token）
# 不引入 _skip_auth：测真实鉴权行为
client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _mock_db():
    # 覆盖数据库会话，避免连真实库
    # 不带 token 时 credentials is None，在查库前就抛异常，session 不会被用到
    # 但 FastAPI 求解 get_current_admin 时仍会求解 SessionDep，所以需要一个 mock session 存在
    session = AsyncMock()
    result = Mock()
    result.scalar_one_or_none = Mock(return_value=None)
    session.execute.return_value = result

    async def _override():
        yield session

    app.dependency_overrides[get_db_session] = _override
    yield session
    app.dependency_overrides.clear()


def _make_png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="PNG")
    return buf.getvalue()


def _override_content_storage(tmp_path: Path) -> None:
    storage = LocalStorage(
        base_dir=str(tmp_path / "articles" / "content"),
        base_url="/files/articles/content",
    )
    app.dependency_overrides[get_storage_backend] = lambda: storage


def _override_cover_storage(tmp_path: Path) -> None:
    storage = LocalStorage(
        base_dir=str(tmp_path / "articles" / "cover"),
        base_url="/files/articles/cover",
    )
    app.dependency_overrides[get_article_cover_storage] = lambda: storage


def _override_background_storage(tmp_path: Path) -> None:
    storage = LocalStorage(
        base_dir=str(tmp_path / "site" / "background"),
        base_url="/files/site/background",
    )
    app.dependency_overrides[get_site_background_storage] = lambda: storage


def test_content_image_rejects_missing_token(tmp_path):
    # 不带 token 上传正文图片 -> 401 + 不写盘
    _override_content_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.post(
            "/api/admin/files/articles/content-images",
            files={"file": ("test.png", content, "image/png")},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "401"
        assert body["message"] == "未登录"
        assert body["data"] is None

        # 副作用验证：路由没执行，storage.save 没被调用，临时目录无文件
        content_dir = tmp_path / "articles" / "content"
        if content_dir.exists():
            assert not list(content_dir.glob("*"))
    finally:
        app.dependency_overrides.pop(get_storage_backend, None)


def test_content_image_rejects_invalid_token(tmp_path):
    # 带错误 token 上传正文图片 -> 401 + 不写盘
    _override_content_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.post(
            "/api/admin/files/articles/content-images",
            files={"file": ("test.png", content, "image/png")},
            headers={"Authorization": "Bearer invalid.token.here"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "401"
        assert body["message"] == "登录已过期，请重新登录"
        assert body["data"] is None

        content_dir = tmp_path / "articles" / "content"
        if content_dir.exists():
            assert not list(content_dir.glob("*"))
    finally:
        app.dependency_overrides.pop(get_storage_backend, None)


def test_content_image_cleanup_rejects_missing_token_without_side_effect(_mock_db):
    response = client.request(
        "DELETE",
        "/api/admin/files/articles/content-images",
        json={"file_url": "/files/articles/content/image.png"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "code": "401",
        "message": "未登录",
        "data": None,
    }
    _mock_db.execute.assert_not_awaited()
    _mock_db.commit.assert_not_awaited()


def test_article_cover_rejects_missing_token(tmp_path):
    # 不带 token 上传文章封面 -> 401 + 不写盘 + 不写库
    # 封面路由既写文件又写数据库，路由没执行则两者都不发生
    # 用"临时目录无文件"间接验证路由没执行（数据库写入也自然没发生）
    _override_cover_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/articles/1/cover",
            files={"file": ("cover.png", content, "image/png")},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "401"
        assert body["message"] == "未登录"
        assert body["data"] is None

        cover_dir = tmp_path / "articles" / "cover"
        if cover_dir.exists():
            assert not list(cover_dir.glob("*"))
    finally:
        app.dependency_overrides.pop(get_article_cover_storage, None)


def test_site_background_rejects_missing_token(tmp_path):
    # 不带 token 上传站点头图 -> 401 + 不写盘
    _override_background_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/site-config/background",
            files={"file": ("background.png", content, "image/png")},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "401"
        assert body["message"] == "未登录"
        assert body["data"] is None

        background_dir = tmp_path / "site" / "background"
        if background_dir.exists():
            assert not list(background_dir.glob("*"))
    finally:
        app.dependency_overrides.pop(get_site_background_storage, None)


def test_site_background_rejects_invalid_token(tmp_path):
    # 带错误 token 上传站点头图 -> 401 + 不写盘
    _override_background_storage(tmp_path)
    try:
        content = _make_png_bytes()
        response = client.put(
            "/api/admin/files/site-config/background",
            files={"file": ("background.png", content, "image/png")},
            headers={"Authorization": "Bearer invalid.token.here"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "401"
        assert body["message"] == "登录已过期，请重新登录"
        assert body["data"] is None

        background_dir = tmp_path / "site" / "background"
        if background_dir.exists():
            assert not list(background_dir.glob("*"))
    finally:
        app.dependency_overrides.pop(get_site_background_storage, None)


@pytest.mark.parametrize(
    "path",
    [
        "/api/admin/files/profile/avatar",
        "/api/admin/files/articles/1/cover",
        "/api/admin/files/site-config/background",
    ],
)
def test_bound_image_remove_rejects_missing_token_without_side_effect(_mock_db, path):
    response = client.delete(path)

    assert response.status_code == 200
    assert response.json() == {
        "code": "401",
        "message": "未登录",
        "data": None,
    }
    _mock_db.execute.assert_not_awaited()
    _mock_db.commit.assert_not_awaited()


@pytest.mark.parametrize(
    "path",
    [
        "/api/admin/files/profile/avatar",
        "/api/admin/files/articles/{article_id}/cover",
        "/api/admin/files/site-config/background",
    ],
)
def test_bound_image_remove_openapi_declares_bearer_security(path):
    operation = app.openapi()["paths"][path]["delete"]

    assert operation["security"] == [{"HTTPBearer": []}]


def test_content_image_cleanup_openapi_declares_bearer_security():
    operation = app.openapi()["paths"]["/api/admin/files/articles/content-images"]["delete"]

    assert operation["security"] == [{"HTTPBearer": []}]
