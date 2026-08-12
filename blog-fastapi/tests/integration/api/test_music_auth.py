import asyncio
import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.db.session import get_db_session
from app.main import app
from app.modules.music.models import Music
from tests.integration.config import TEST_DATABASE_URL

client = TestClient(app, raise_server_exceptions=False)
auth_test_engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
auth_session_factory = async_sessionmaker(auth_test_engine, expire_on_commit=False, class_=AsyncSession)


async def _prepare_music_table() -> None:
    async with auth_test_engine.begin() as connection:
        await connection.run_sync(Music.__table__.create, checkfirst=True)


@pytest.fixture(autouse=True)
def _test_database_session():
    async def _session_override():
        async with auth_session_factory() as session:
            yield session

    asyncio.run(_prepare_music_table())
    app.dependency_overrides[get_db_session] = _session_override
    yield
    app.dependency_overrides.pop(get_db_session, None)


def test_admin_endpoints_reject_missing_token():
    requests = [
        client.post(
            "/api/admin/music/tracks",
            data={"data": json.dumps({"title": "歌"})},
            files={"file": ("song.mp3", b"invalid", "audio/mpeg")},
        ),
        client.get("/api/admin/music/tracks"),
        client.get("/api/admin/music/tracks/1"),
        client.patch("/api/admin/music/tracks/1", json={"data": {"title": "歌"}}),
        client.delete("/api/admin/music/tracks/1"),
    ]

    assert all(response.status_code == 401 for response in requests)
    assert all(response.json()["data"] is None for response in requests)


def test_admin_endpoints_reject_invalid_token():
    response = client.get(
        "/api/admin/music/tracks",
        headers={"Authorization": "Bearer invalid"},
    )

    assert response.status_code == 401
    assert response.json()["data"] is None


def test_public_list_requires_no_auth():
    response = client.get("/api/music/tracks")

    assert response.status_code == 200


def test_admin_endpoints_openapi_declares_bearer_security():
    paths = app.openapi()["paths"]
    admin_operations = [
        paths["/api/admin/music/tracks"]["get"],
        paths["/api/admin/music/tracks"]["post"],
        paths["/api/admin/music/tracks/{music_id}"]["get"],
        paths["/api/admin/music/tracks/{music_id}"]["patch"],
        paths["/api/admin/music/tracks/{music_id}"]["delete"],
    ]

    assert all(operation.get("security") for operation in admin_operations)
    assert "security" not in paths["/api/music/tracks"]["get"]
