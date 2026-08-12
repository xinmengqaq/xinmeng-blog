import asyncio
import io
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.core.exceptions import BusinessException
from app.db.session import get_db_session
from app.main import app
from app.modules.file.image import service
from app.modules.file.image.schemas import ImageUploadData
from app.modules.file.image.service import ImageService
from app.modules.file.storage.dependencies import get_user_avatar_storage
from app.modules.file.storage.local_disk import LocalStorage
from app.modules.user.dependencies import get_current_user
from app.modules.user import dependencies as user_dependencies
from app.modules.auth import service as auth_service


def _make_png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buffer, format="PNG")
    return buffer.getvalue()


def _make_gif_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buffer, format="GIF")
    return buffer.getvalue()


def test_upload_user_avatar_success(monkeypatch):
    user = SimpleNamespace(id=7, avatar=None, status="enabled")
    storage = SimpleNamespace(save=AsyncMock(return_value="/files/users/avatar/new.png"))
    session = SimpleNamespace(commit=AsyncMock(), rollback=AsyncMock())
    monkeypatch.setattr(service, "get_user", AsyncMock(return_value=user))

    result = asyncio.run(
        ImageService(session, storage).update_user_avatar(
            7,
            ImageUploadData(
                filename="avatar.png",
                content_type="image/png",
                content=_make_png_bytes(),
            ),
        )
    )

    assert result == "/files/users/avatar/new.png"
    assert user.avatar == result
    session.commit.assert_awaited_once()


def test_upload_user_avatar_rejects_gif(monkeypatch):
    monkeypatch.setattr(service, "get_user", AsyncMock())

    with pytest.raises(BusinessException, match="文件类型不允许"):
        asyncio.run(
            ImageService(AsyncMock(), AsyncMock()).update_user_avatar(
                7,
                ImageUploadData(
                    filename="avatar.gif",
                    content_type="image/gif",
                    content=_make_gif_bytes(),
                ),
            )
        )

    service.get_user.assert_not_awaited()


def test_upload_user_avatar_requires_user_token():
    with pytest.raises(BusinessException) as exc_info:
        asyncio.run(get_current_user(None, AsyncMock(), SimpleNamespace(state=SimpleNamespace())))

    assert exc_info.value.code == "401"
    assert exc_info.value.message == "未登录"


def test_user_avatar_rejects_admin_token(monkeypatch):
    monkeypatch.setattr(user_dependencies, "decode_token", lambda _: {
        "sub": "7",
        "passwordVersion": 1,
        "tokenType": "admin",
    })
    session = SimpleNamespace(execute=AsyncMock())
    credentials = SimpleNamespace(credentials="admin-token")

    with pytest.raises(BusinessException) as exc_info:
        asyncio.run(get_current_user(credentials, session, SimpleNamespace(state=SimpleNamespace())))

    assert exc_info.value.code == "401"
    session.execute.assert_not_awaited()


def test_admin_auth_rejects_user_token(monkeypatch):
    monkeypatch.setattr(auth_service, "decode_token", lambda _: {
        "sub": "7",
        "passwordVersion": 1,
        "tokenType": "user",
    })
    session = SimpleNamespace(execute=AsyncMock())

    with pytest.raises(BusinessException) as exc_info:
        asyncio.run(auth_service.authenticate("user-token", session))

    assert exc_info.value.code == "401"
    session.execute.assert_not_awaited()


def test_user_auth_exposes_user_id_to_request_log(monkeypatch):
    monkeypatch.setattr(user_dependencies, "decode_token", lambda _: {
        "sub": "7",
        "passwordVersion": 1,
        "tokenType": "user",
    })
    user = SimpleNamespace(id=7, status="enabled", password_version=1)
    result = SimpleNamespace(scalar_one_or_none=lambda: user)
    session = SimpleNamespace(execute=AsyncMock(return_value=result))
    request = SimpleNamespace(state=SimpleNamespace())
    credentials = SimpleNamespace(credentials="user-token")

    user_id = asyncio.run(get_current_user(credentials, session, request))

    assert user_id == 7
    assert request.state.user_id == 7


def test_remove_user_avatar_clears_url_and_file(monkeypatch):
    old_url = "/files/users/avatar/old.png"
    user = SimpleNamespace(id=7, avatar=old_url, status="enabled")
    storage = SimpleNamespace(delete=AsyncMock(return_value=True))
    session = SimpleNamespace(commit=AsyncMock(), rollback=AsyncMock())
    monkeypatch.setattr(service, "get_user", AsyncMock(return_value=user))

    asyncio.run(ImageService(session, storage).remove_user_avatar(7))

    assert user.avatar is None
    session.commit.assert_awaited_once()
    storage.delete.assert_awaited_once_with(old_url)


def test_user_avatar_route_saves_file_and_returns_url(tmp_path):
    user = SimpleNamespace(id=7, avatar=None, status="enabled")
    result = SimpleNamespace(scalar_one_or_none=lambda: user)
    session = SimpleNamespace(
        execute=AsyncMock(return_value=result),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    storage = LocalStorage(
        base_dir=str(tmp_path / "users" / "avatar"),
        base_url="/files/users/avatar",
    )

    async def override_user() -> int:
        return 7

    async def override_session():
        yield session

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_user_avatar_storage] = lambda: storage
    try:
        response = TestClient(app).put(
            "/api/user/files/profile/avatar",
            files={"file": ("avatar.png", _make_png_bytes(), "image/png")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    file_url = response.json()["data"]["file_url"]
    assert file_url.startswith("/files/users/avatar/")
    assert (tmp_path / "users" / "avatar" / file_url.rsplit("/", 1)[-1]).exists()
    assert user.avatar == file_url


def test_user_avatar_route_requires_token():
    response = TestClient(app).put(
        "/api/user/files/profile/avatar",
        files={"file": ("avatar.png", _make_png_bytes(), "image/png")},
    )

    assert response.status_code == 401
    assert response.json() == {"code": "401", "message": "未登录", "data": None}
