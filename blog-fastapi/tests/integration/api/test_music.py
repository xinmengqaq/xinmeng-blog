import asyncio
import json
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.db.session import get_db_session
from app.main import app
from app.modules.auth.dependencies import get_current_admin
from app.modules.file.storage.dependencies import get_music_audio_storage
from app.modules.file.storage.local_disk import LocalStorage
from app.modules.music.models import Music
from tests.integration.config import TEST_DATABASE_URL

test_engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
music_session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
client = TestClient(app, raise_server_exceptions=False)
TITLE_PREFIX = "task6-"


def _mp3_bytes() -> bytes:
    frame = bytearray(417)
    frame[:4] = b"\xff\xfb\x90\x00"
    return bytes(frame) * 20


async def _cleanup_music() -> None:
    async with music_session_factory() as session:
        await session.execute(delete(Music).where(Music.title.like(f"{TITLE_PREFIX}%")))
        await session.commit()


async def _prepare_music_table() -> None:
    async with test_engine.begin() as connection:
        await connection.run_sync(Music.__table__.create, checkfirst=True)


async def _insert_music(*, enabled: bool = True, title: str | None = None) -> Music:
    async with music_session_factory() as session:
        music = Music(
            title=title or f"{TITLE_PREFIX}{uuid4().hex}",
            artist="测试歌手",
            audio_url=f"/files/music/audio/{uuid4().hex}.mp3",
            duration_ms=1000,
            is_enabled=enabled,
        )
        session.add(music)
        await session.commit()
        await session.refresh(music)
        return music


async def _get_music(music_id: int) -> Music | None:
    async with music_session_factory() as session:
        return await session.get(Music, music_id)


@pytest.fixture(autouse=True)
def _music_dependencies(tmp_path: Path):
    async def _session_override():
        async with music_session_factory() as session:
            yield session

    async def _admin_override() -> int:
        return 1

    storage = LocalStorage(tmp_path / "music" / "audio", "/files/music/audio")
    asyncio.run(_prepare_music_table())
    asyncio.run(_cleanup_music())
    app.dependency_overrides[get_db_session] = _session_override
    app.dependency_overrides[get_current_admin] = _admin_override
    app.dependency_overrides[get_music_audio_storage] = lambda: storage
    yield storage
    app.dependency_overrides.clear()
    asyncio.run(_cleanup_music())


def _create(title: str, artist: str | None = "测试歌手"):
    return client.post(
        "/api/admin/music/tracks",
        data={"data": json.dumps({"title": title, "artist": artist}, ensure_ascii=False)},
        files={"file": ("song.mp3", _mp3_bytes(), "audio/mpeg")},
    )


def test_create_music_success(_music_dependencies):
    title = f"{TITLE_PREFIX}{uuid4().hex}"

    response = _create(title)

    assert response.status_code == 200
    data = response.json()["data"]
    assert set(data) == {
        "id", "title", "artist", "audio_url", "duration_ms", "is_enabled", "created_at", "updated_at"
    }
    assert data["title"] == title
    assert data["audio_url"].startswith("/files/music/audio/")
    assert data["duration_ms"] > 0
    assert data["is_enabled"] is True
    assert (_music_dependencies.base_dir / data["audio_url"].rsplit("/", 1)[-1]).exists()


def test_create_music_rejects_invalid_file():
    title = f"{TITLE_PREFIX}{uuid4().hex}"
    response = client.post(
        "/api/admin/music/tracks",
        data={"data": json.dumps({"title": title})},
        files={"file": ("song.mp3", b"not mp3", "audio/mpeg")},
    )

    assert response.status_code == 400
    assert response.json()["data"] is None
    assert asyncio.run(_find_by_title(title)) is None


async def _find_by_title(title: str) -> Music | None:
    async with music_session_factory() as session:
        return (await session.execute(select(Music).where(Music.title == title))).scalar_one_or_none()


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}])
def test_list_rejects_invalid_pagination(params):
    response = client.get("/api/music/tracks", params=params)

    assert response.status_code == 400
    assert response.json()["data"] is None


def test_admin_list_contains_all_records():
    enabled = asyncio.run(_insert_music(enabled=True))
    disabled = asyncio.run(_insert_music(enabled=False))

    response = client.get("/api/admin/music/tracks", params={"page_size": 100})

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["data"]["items"]]
    assert enabled.id in ids and disabled.id in ids
    assert ids.index(enabled.id) < ids.index(disabled.id)


def test_public_list_only_enabled():
    enabled = asyncio.run(_insert_music(enabled=True))
    disabled = asyncio.run(_insert_music(enabled=False))

    response = client.get("/api/music/tracks", params={"page_size": 100})

    assert response.status_code == 200
    items = response.json()["data"]["items"]
    ids = [item["id"] for item in items]
    assert enabled.id in ids
    assert disabled.id not in ids
    assert all("is_enabled" not in item and "created_at" not in item and "updated_at" not in item for item in items)


def test_list_empty_and_beyond_last_page():
    empty = client.get("/api/music/tracks")
    asyncio.run(_insert_music())
    beyond = client.get("/api/music/tracks", params={"page": 2, "page_size": 100})

    assert empty.status_code == 200
    assert empty.json()["data"] == {"items": [], "page": 1, "page_size": 20, "total": 0, "total_pages": 0}
    assert beyond.status_code == 200
    assert beyond.json()["data"]["items"] == []


def test_update_music_partial_fields():
    music = asyncio.run(_insert_music())
    new_title = f"{TITLE_PREFIX}{uuid4().hex}"

    response = client.patch(
        f"/api/admin/music/tracks/{music.id}",
        json={"data": {"title": new_title, "artist": "   "}},
    )

    assert response.status_code == 200
    assert response.json()["data"]["title"] == new_title
    assert response.json()["data"]["artist"] is None
    stored = asyncio.run(_get_music(music.id))
    assert stored is not None and stored.title == new_title and stored.artist is None


@pytest.mark.parametrize("payload", [{"data": {}}, {"data": {"title": "   "}}, {"title": "越权裸字段"}])
def test_update_music_rejects_no_fields_or_empty_title(payload):
    music = asyncio.run(_insert_music())

    response = client.patch(f"/api/admin/music/tracks/{music.id}", json=payload)

    assert response.status_code == 400
    assert response.json()["data"] is None


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_music_not_found(method):
    kwargs = {"json": {"data": {"title": f"{TITLE_PREFIX}missing"}}} if method == "patch" else {}
    response = getattr(client, method)("/api/admin/music/tracks/9223372036854775807", **kwargs)

    assert response.status_code == 404
    assert response.json() == {"code": "404", "message": "音乐不存在", "data": None}


def test_delete_music_success(_music_dependencies):
    created = _create(f"{TITLE_PREFIX}{uuid4().hex}").json()["data"]
    stored_file = _music_dependencies.base_dir / created["audio_url"].rsplit("/", 1)[-1]

    response = client.delete(f"/api/admin/music/tracks/{created['id']}")

    assert response.status_code == 200
    assert response.json() == {"code": "200", "message": "请求成功", "data": None}
    assert asyncio.run(_get_music(created["id"])) is None
    assert not stored_file.exists()


def test_openapi_declares_music_paths_and_schemas():
    schema = app.openapi()
    admin_path = schema["paths"]["/api/admin/music/tracks"]
    detail_path = schema["paths"]["/api/admin/music/tracks/{music_id}"]

    assert set(admin_path) >= {"get", "post"}
    assert set(detail_path) >= {"get", "patch", "delete"}
    assert "get" in schema["paths"]["/api/music/tracks"]
    assert "multipart/form-data" in admin_path["post"]["requestBody"]["content"]
    assert "application/json" in detail_path["patch"]["requestBody"]["content"]
