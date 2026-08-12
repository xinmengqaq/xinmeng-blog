import asyncio
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import BusinessException, DatabaseException, ResponseCode
from app.modules.music.models import Music
from app.modules.music.schemas import MusicQuery, MusicUpdate
from app.modules.music.service import MusicService


def _row(music_id, enabled=True, title="歌", artist=None):
    return Music(
        id=music_id,
        title=title,
        artist=artist,
        audio_url=f"/files/music/audio/{music_id}.mp3",
        duration_ms=1000,
        is_enabled=enabled,
    )


def _list_session(rows, total):
    session = AsyncMock()
    result = Mock()
    result.scalar_one.return_value = total
    scalars = Mock()
    scalars.all.return_value = rows
    result.scalars.return_value = scalars
    session.execute.return_value = result
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


def _update_session(music):
    session = AsyncMock()
    result = Mock()
    result.scalar_one_or_none.return_value = music
    session.execute.return_value = result
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    return session


def _run(coro):
    return asyncio.run(coro)


# ===== BDD-004 管理/公开列表范围与稳定排序 =====

def test_admin_list_returns_all_records_and_public_list_only_enabled():
    # 假如 音乐库同时存在启用和停用记录
    # 当 管理员和访客分别查询同一页
    # 那么 管理员看到全部记录而访客只看到启用记录
    # 并且 结果按创建时间和 ID 正序稳定排列
    rows = [_row(1, enabled=True), _row(2, enabled=False)]
    admin = _list_session(rows, total=2)
    admin_page = _run(MusicService(admin, None).list_music(MusicQuery(), include_disabled=True))

    assert [m.id for m in admin_page.items] == [1, 2]
    assert admin_page.total == 2
    assert all(s.args[0].whereclause is None for s in admin.execute.await_args_list)

    enabled_only = [_row(1, enabled=True)]
    public = _list_session(enabled_only, total=1)
    public_page = _run(MusicService(public, None).list_music(MusicQuery(), include_disabled=False))

    assert [m.id for m in public_page.items] == [1]
    assert public_page.total == 1
    assert any(s.args[0].whereclause is not None for s in public.execute.await_args_list)


# ===== BDD-005 空库与超页空分页 =====

def test_empty_library_returns_empty_page_with_zero_total_pages():
    # 假如 音乐库为空
    # 当 请求分页列表
    # 那么 items 为空且请求成功
    # 并且 空库 total_pages 为 0
    session = _list_session([], total=0)
    page = _run(MusicService(session, None).list_music(MusicQuery(), include_disabled=True))

    assert page.items == []
    assert page.total == 0
    assert page.total_pages == 0


def test_page_beyond_last_returns_empty_items():
    # 假如 页码超过最后一页
    # 当 请求分页列表
    # 那么 items 为空且请求成功
    session = _list_session([], total=2)
    page = _run(MusicService(session, None).list_music(MusicQuery(page=5, page_size=20), include_disabled=True))

    assert page.items == []
    assert page.total == 2
    assert page.total_pages == 1


# ===== BDD-007 局部更新与空歌手归一 =====

def test_update_changes_only_allowed_fields_and_normalizes_blank_artist_to_null():
    # 假如 音乐记录存在
    # 当 管理员修改任意允许字段
    # 那么 只更新提交的字段并返回完整记录
    # 并且 artist 的 null 或空字符串被保存为 null
    music = _row(1, enabled=True, artist="原歌手")
    session = _update_session(music)
    updated = _run(MusicService(session, None).update_music(1, MusicUpdate(title="新歌", artist="  ")))

    assert updated.title == "新歌"
    assert updated.artist is None
    assert updated.is_enabled is True


# ===== BDD-009 相同值重复更新成功 =====

def test_update_same_values_succeeds_and_keeps_record_unchanged():
    # 假如 音乐记录已经具有目标值
    # 当 管理员再次提交相同值
    # 那么 请求成功且记录保持一致
    music = _row(1, enabled=True, title="歌1", artist=None)
    session = _update_session(music)
    updated = _run(MusicService(session, None).update_music(1, MusicUpdate(title="歌1")))

    assert updated.title == "歌1"
    assert updated.artist is None
    assert updated.is_enabled is True


# ===== BDD-014 详情与更新找不到记录抛 404 =====

def test_get_music_detail_raises_404_when_not_found():
    # 假如 指定音乐 ID 不存在
    # 当 管理员查询该音乐详情
    # 那么 返回音乐不存在异常（404）
    session = _update_session(None)
    with pytest.raises(BusinessException) as exc_info:
        _run(MusicService(session, None).get_music(999))

    assert exc_info.value.code == ResponseCode.NOT_FOUND


def test_update_music_raises_404_when_not_found():
    # 假如 指定音乐 ID 不存在
    # 当 管理员修改该音乐
    # 那么 返回音乐不存在异常（404）
    session = _update_session(None)
    with pytest.raises(BusinessException) as exc_info:
        _run(MusicService(session, None).update_music(999, MusicUpdate(title="新歌")))

    assert exc_info.value.code == ResponseCode.NOT_FOUND


# ===== SQLAlchemy 异常转换为 DatabaseException =====

def test_list_db_failure_raises_database_exception():
    session = AsyncMock()
    session.execute = AsyncMock(side_effect=SQLAlchemyError("db down"))

    with pytest.raises(DatabaseException):
        _run(MusicService(session, None).list_music(MusicQuery()))


def test_update_db_failure_rolls_back_and_raises_database_exception():
    session = _update_session(_row(1))
    session.commit.side_effect = SQLAlchemyError("commit failed")

    with pytest.raises(DatabaseException):
        _run(MusicService(session, None).update_music(1, MusicUpdate(title="新歌")))

    session.rollback.assert_awaited_once()
