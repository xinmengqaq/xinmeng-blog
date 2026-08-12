import asyncio
from unittest.mock import AsyncMock, Mock

import pytest
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import BusinessException, DatabaseException
from app.modules.music import service as music_service
from app.modules.music.dependencies import get_music_service
from app.modules.music.models import Music
from app.modules.music.schemas import CreateMusicData
from app.modules.music.service import MusicService


class _FakeStorage:
    def __init__(self):
        self.saved_url = "/files/music/audio/abc.mp3"
        self.deleted = []

    async def save(self, data: bytes, filename: str) -> str:
        return self.saved_url

    def owns(self, file_url: str) -> bool:
        return file_url.startswith("/files/music/audio/")

    async def delete(self, file_url: str) -> bool:
        self.deleted.append(file_url)
        return True


class _Upload:
    def __init__(self, filename="song.mp3", content_type="audio/mpeg", content=b"x"):
        self.filename = filename
        self.content_type = content_type
        self._content = content

    async def read(self, size=-1):
        return self._content


def _session(commit_effect=None):
    s = AsyncMock()
    s.add = Mock()
    s.commit = AsyncMock(side_effect=commit_effect)
    s.rollback = AsyncMock()
    return s


def _run(coro):
    return asyncio.run(coro)


def test_music_service_dependency_keeps_request_scoped_tools():
    storage = _FakeStorage()
    session = _session()

    service = get_music_service(session=session, storage=storage)

    assert isinstance(service, MusicService)
    assert service.session is session
    assert service.storage is storage


def test_create_music_data_groups_business_fields():
    data = CreateMusicData(title="我的歌", artist="歌手")

    assert data.title == "我的歌"
    assert data.artist == "歌手"


# ===== BDD-001 合法输入保存文件并写入默认启用记录 =====

def test_create_music_valid_input_commits_enabled_record(monkeypatch):
    # 假如 管理员提交合法歌曲信息和 MP3
    # 当 管理员创建音乐
    # 那么 文件被保存且音乐记录写入解析后的正时长
    # 并且 新音乐默认启用
    storage = _FakeStorage()
    session = _session()
    created = {}

    fake_add = lambda instance: created.__setitem__("music", instance)  # noqa: E731

    session.add = Mock(side_effect=fake_add)
    monkeypatch.setattr(
        music_service,
        "save_audio",
        AsyncMock(return_value=music_service.AudioSaveResult("/files/music/audio/abc.mp3", 5000)),
    )

    music = _run(
        MusicService(session, storage).create(
            CreateMusicData(title="  我的歌  ", artist=" 歌手"),
            _Upload(),
        )
    )

    assert music.title == "我的歌"
    assert music.artist == "歌手"
    assert music.duration_ms == 5000
    assert music.audio_url == "/files/music/audio/abc.mp3"
    assert music.is_enabled is True
    session.add.assert_called_once()
    session.commit.assert_awaited_once()


def test_create_music_blank_artist_normalized_to_none(monkeypatch):
    # 假如 管理员提交的歌手是空字符串或纯空格
    # 当 创建音乐
    # 那么 歌手按 NULL 保存
    storage = _FakeStorage()
    session = _session()
    monkeypatch.setattr(
        music_service,
        "save_audio",
        AsyncMock(return_value=music_service.AudioSaveResult("/files/music/audio/abc.mp3", 1000)),
    )

    music = _run(
        MusicService(session, storage).create(
            CreateMusicData(title="歌", artist="   "),
            _Upload(),
        )
    )

    assert music.artist is None


def test_create_music_rejects_blank_title(monkeypatch):
    # 假如 歌曲名去除首尾空格后为空
    # 当 创建音乐
    # 那么 按参数错误失败且不保存文件
    storage = _FakeStorage()
    monkeypatch.setattr(music_service, "save_audio", AsyncMock())

    with pytest.raises(ValidationError):
        CreateMusicData(title="   ", artist=None)

    music_service.save_audio.assert_not_awaited()


# ===== BDD-003 数据库提交失败时补偿清理新文件 =====

def test_create_music_db_failure_rolls_back_and_deletes_new_file(monkeypatch):
    # 假如 有效 MP3 已保存但数据库提交失败
    # 当 创建流程回滚
    # 那么 本次新文件被删除且客户端收到系统异常
    storage = _FakeStorage()
    session = _session(commit_effect=SQLAlchemyError("commit failed"))
    monkeypatch.setattr(
        music_service,
        "save_audio",
        AsyncMock(return_value=music_service.AudioSaveResult("/files/music/audio/abc.mp3", 1000)),
    )

    with pytest.raises(DatabaseException):
        _run(
            MusicService(session, storage).create(
                CreateMusicData(title="歌", artist=None),
                _Upload(),
            )
        )

    session.rollback.assert_awaited_once()
    assert storage.deleted == ["/files/music/audio/abc.mp3"]


def test_create_music_compensation_failure_keeps_db_cause(monkeypatch):
    # 假如 有效 MP3 已保存但数据库提交失败，且补偿删除也失败
    # 当 创建流程回滚
    # 那么 补偿失败不覆盖原数据库异常
    storage = _FakeStorage()
    session = _session(commit_effect=SQLAlchemyError("commit failed"))
    monkeypatch.setattr(
        music_service,
        "save_audio",
        AsyncMock(return_value=music_service.AudioSaveResult("/files/music/audio/abc.mp3", 1000)),
    )
    storage.delete = AsyncMock(side_effect=OSError("disk error"))

    with pytest.raises(DatabaseException) as exc_info:
        _run(
            MusicService(session, storage).create(
                CreateMusicData(title="歌", artist=None),
                _Upload(),
            )
        )

    assert isinstance(exc_info.value.__cause__, SQLAlchemyError)
