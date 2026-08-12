import asyncio
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import BusinessException, DatabaseException, ResponseCode, SystemException
from app.modules.music.models import Music
from app.modules.music.service import MusicService


class _FakeStorage:
    def __init__(self):
        self.deleted = []

    def owns(self, file_url: str) -> bool:
        return file_url.startswith("/files/music/audio/")

    async def delete(self, file_url: str) -> bool:
        self.deleted.append(file_url)
        return True


def _row(music_id, enabled=True):
    return Music(
        id=music_id,
        title="歌",
        artist=None,
        audio_url=f"/files/music/audio/{music_id}.mp3",
        duration_ms=1000,
        is_enabled=enabled,
    )


def _fetch_session(music):
    session = AsyncMock()
    result = Mock()
    result.scalar_one_or_none.return_value = music
    session.execute.return_value = result
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.delete = AsyncMock()
    return session


def _run(coro):
    return asyncio.run(coro)


# ===== BDD-010 严格按停用提交、文件删除、记录删除提交的顺序执行 =====
def test_delete_disables_first_then_deletes_file_then_deletes_record():
    # 假如 音乐记录和 MP3 文件都存在
    # 当 管理员删除音乐
    # 那么 先提交停用状态，再删除文件，最后删除记录并提交
    music = _row(1, enabled=True)
    events = []
    session = _fetch_session(music)
    session.commit = AsyncMock(side_effect=lambda: events.append("commit"))
    session.delete = AsyncMock(side_effect=lambda m: events.append("delete_record"))
    storage = _FakeStorage()
    storage.delete = AsyncMock(side_effect=lambda url: events.append("delete_file"))

    _run(MusicService(session, storage).delete_music(1))

    assert music.is_enabled is False
    assert events == ["commit", "delete_file", "delete_record", "commit"]


# ===== BDD-011 文件清理失败保留停用记录，重试可完成 =====
def test_delete_file_failure_raises_system_exception_and_keeps_disabled_record():
    # 假如 音乐已停用但文件删除失败
    # 当 删除流程抛出系统异常
    # 那么 停用记录仍保留且访客不可见
    music = _row(1, enabled=True)
    session = _fetch_session(music)
    storage = _FakeStorage()
    storage.delete = AsyncMock(side_effect=OSError("disk error"))

    with pytest.raises(SystemException):
        _run(MusicService(session, storage).delete_music(1))

    assert music.is_enabled is False
    session.delete.assert_not_called()


def test_delete_retry_completes_after_file_failure():
    # 假如 文件清理失败导致首次删除返回系统异常
    # 当 文件可删除后管理员再次重试删除
    # 那么 记录与文件最终都被删除
    music = _row(1, enabled=True)
    session = _fetch_session(music)
    storage = _FakeStorage()
    storage.delete = AsyncMock(side_effect=[OSError("disk error"), True])

    with pytest.raises(SystemException):
        _run(MusicService(session, storage).delete_music(1))

    _run(MusicService(session, storage).delete_music(1))

    assert music.is_enabled is False
    session.delete.assert_called_once()
    assert storage.delete.await_count == 2
    assert storage.delete.await_args_list[1].args[0] == f"/files/music/audio/{music.id}.mp3"


# ===== BDD-012 最终数据库删除失败回滚，停用状态保留 =====
def test_final_db_delete_failure_rolls_back_and_keeps_disabled_record():
    # 假如 文件已不存在且最终数据库删除失败
    # 当 事务回滚并抛出数据库异常
    # 那么 停用记录仍保留
    music = _row(1, enabled=True)
    session = _fetch_session(music)
    session.commit = AsyncMock(side_effect=[None, SQLAlchemyError("final delete failed")])

    with pytest.raises(DatabaseException):
        _run(MusicService(session, _FakeStorage()).delete_music(1))

    session.rollback.assert_awaited_once()
    assert music.is_enabled is False


def test_delete_retry_completes_after_final_db_failure():
    # 假如 最终数据库删除失败导致首次删除返回数据库异常
    # 当 再次重试删除
    # 那么 后续重试可以完成删除
    music = _row(1, enabled=True)
    session = _fetch_session(music)
    session.commit = AsyncMock(side_effect=[None, SQLAlchemyError("final delete failed")])

    with pytest.raises(DatabaseException):
        _run(MusicService(session, _FakeStorage()).delete_music(1))

    session.commit = AsyncMock(side_effect=[None, None])
    _run(MusicService(session, _FakeStorage()).delete_music(1))

    assert session.delete.await_count == 2


# ===== BDD-014 不存在返回 404；文件已不存在按成功继续 =====
def test_delete_not_found_raises_404():
    # 假如 指定音乐 ID 不存在
    # 当 管理员删除该音乐
    # 那么 返回音乐不存在异常（404）
    session = _fetch_session(None)

    with pytest.raises(BusinessException) as exc_info:
        _run(MusicService(session, _FakeStorage()).delete_music(999))

    assert exc_info.value.code == ResponseCode.NOT_FOUND


def test_delete_when_file_already_missing_still_succeeds():
    # 假如 音乐记录存在但 MP3 文件已不存在
    # 当 管理员删除音乐
    # 那么 文件清理视为成功且记录被删除
    music = _row(1, enabled=True)
    session = _fetch_session(music)
    storage = _FakeStorage()
    storage.delete = AsyncMock(return_value=False)

    _run(MusicService(session, storage).delete_music(1))

    assert music.is_enabled is False
    session.delete.assert_called_once()
