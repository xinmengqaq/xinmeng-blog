import asyncio
import os
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi import FastAPI
from sqlalchemy.exc import SQLAlchemyError

import app.db.lifespan as lifespan_module
import app.modules.file.image.user_avatar_cleanup as cleanup_module
from app.modules.file.image.user_avatar_cleanup import cleanup_orphan_user_avatars
from app.modules.file.storage.local_disk import LocalStorage


def _query_result(urls: list[str]) -> SimpleNamespace:
    return SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: urls),
    )


def _make_old_avatar(storage: LocalStorage, filename: str, now: datetime) -> str:
    file_url = asyncio.run(storage.save(b"avatar", filename))
    file_path = storage._managed_path(file_url)
    assert file_path is not None
    old_timestamp = (now - timedelta(hours=2)).timestamp()
    os.utime(file_path, (old_timestamp, old_timestamp))
    return file_url


def test_cleanup_orphan_user_avatar_deletes_unreferenced_old_file(tmp_path):
    now = datetime(2026, 8, 13, tzinfo=timezone.utc)
    storage = LocalStorage(
        base_dir=str(tmp_path / "users" / "avatar"),
        base_url="/files/users/avatar",
    )
    file_url = _make_old_avatar(storage, "orphan.png", now)
    session = SimpleNamespace(
        execute=AsyncMock(side_effect=[_query_result([]), _query_result([])]),
        rollback=AsyncMock(),
    )

    deleted_count = asyncio.run(cleanup_orphan_user_avatars(session, storage, now=now))

    assert deleted_count == 1
    assert not storage._managed_path(file_url).exists()
    assert session.execute.await_count == 2
    session.rollback.assert_not_awaited()


def test_cleanup_orphan_user_avatar_preserves_referenced_file(tmp_path):
    now = datetime(2026, 8, 13, tzinfo=timezone.utc)
    storage = LocalStorage(
        base_dir=str(tmp_path / "users" / "avatar"),
        base_url="/files/users/avatar",
    )
    file_url = _make_old_avatar(storage, "pending-deletion.png", now)
    session = SimpleNamespace(
        execute=AsyncMock(return_value=_query_result([file_url])),
        rollback=AsyncMock(),
    )

    deleted_count = asyncio.run(cleanup_orphan_user_avatars(session, storage, now=now))

    assert deleted_count == 0
    assert storage._managed_path(file_url).exists()
    session.execute.assert_awaited_once()


def test_cleanup_orphan_user_avatar_preserves_file_referenced_during_second_check(tmp_path):
    now = datetime(2026, 8, 13, tzinfo=timezone.utc)
    storage = LocalStorage(
        base_dir=str(tmp_path / "users" / "avatar"),
        base_url="/files/users/avatar",
    )
    file_url = _make_old_avatar(storage, "restored.png", now)
    session = SimpleNamespace(
        execute=AsyncMock(side_effect=[_query_result([]), _query_result([file_url])]),
        rollback=AsyncMock(),
    )

    deleted_count = asyncio.run(cleanup_orphan_user_avatars(session, storage, now=now))

    assert deleted_count == 0
    assert storage._managed_path(file_url).exists()
    assert session.execute.await_count == 2


def test_cleanup_orphan_user_avatar_keeps_files_when_reference_query_fails(tmp_path):
    now = datetime(2026, 8, 13, tzinfo=timezone.utc)
    storage = LocalStorage(
        base_dir=str(tmp_path / "users" / "avatar"),
        base_url="/files/users/avatar",
    )
    file_url = _make_old_avatar(storage, "query-failure.png", now)
    session = SimpleNamespace(
        execute=AsyncMock(side_effect=SQLAlchemyError("database unavailable")),
        rollback=AsyncMock(),
    )

    deleted_count = asyncio.run(cleanup_orphan_user_avatars(session, storage, now=now))

    assert deleted_count == 0
    assert storage._managed_path(file_url).exists()
    session.rollback.assert_awaited_once()


class _FailingDeleteStorage(LocalStorage):
    async def delete(self, file_url: str) -> bool:
        if file_url.endswith("failed.png"):
            raise OSError("disk busy")
        return await super().delete(file_url)


def test_cleanup_orphan_user_avatar_continues_after_individual_delete_failure(tmp_path):
    now = datetime(2026, 8, 13, tzinfo=timezone.utc)
    storage = _FailingDeleteStorage(
        base_dir=str(tmp_path / "users" / "avatar"),
        base_url="/files/users/avatar",
    )
    failed_url = _make_old_avatar(storage, "failed.png", now)
    deleted_url = _make_old_avatar(storage, "deleted.png", now)
    session = SimpleNamespace(
        execute=AsyncMock(side_effect=[_query_result([]), _query_result([])]),
        rollback=AsyncMock(),
    )

    deleted_count = asyncio.run(cleanup_orphan_user_avatars(session, storage, now=now))

    assert deleted_count == 1
    assert storage._managed_path(failed_url).exists()
    assert not storage._managed_path(deleted_url).exists()


def test_lifespan_runs_cleanup_and_cancels_it_on_shutdown(monkeypatch):
    events: list[str] = []
    dispose = AsyncMock()

    async def exercise_lifespan() -> None:
        cleanup_started = asyncio.Event()

        async def cleanup_loop() -> None:
            events.append("started")
            cleanup_started.set()
            try:
                await asyncio.Future()
            except asyncio.CancelledError:
                events.append("cancelled")
                raise

        monkeypatch.setattr(lifespan_module, "run_user_avatar_cleanup_loop", cleanup_loop)
        monkeypatch.setattr(lifespan_module, "engine", SimpleNamespace(dispose=dispose))

        async with lifespan_module.lifespan(FastAPI()):
            await asyncio.wait_for(cleanup_started.wait(), timeout=1)

    asyncio.run(exercise_lifespan())

    assert events == ["started", "cancelled"]
    dispose.assert_awaited_once()


def test_cleanup_loop_runs_once_before_waiting_for_next_interval(monkeypatch):
    cleanup_once = AsyncMock()

    async def exercise_loop() -> None:
        waiting = asyncio.Event()

        async def wait_for_next_interval(seconds: int) -> None:
            assert seconds == cleanup_module.USER_AVATAR_CLEANUP_INTERVAL_SECONDS
            waiting.set()
            await asyncio.Future()

        monkeypatch.setattr(cleanup_module, "run_user_avatar_cleanup_once", cleanup_once)
        monkeypatch.setattr(cleanup_module.asyncio, "sleep", wait_for_next_interval)
        task = asyncio.create_task(cleanup_module.run_user_avatar_cleanup_loop())
        try:
            await asyncio.wait_for(waiting.wait(), timeout=1)
        finally:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    asyncio.run(exercise_loop())

    cleanup_once.assert_awaited_once()


def test_cleanup_loop_continues_after_database_failure(monkeypatch):
    calls = 0
    waiting = asyncio.Event()

    async def cleanup_once() -> None:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise SQLAlchemyError("database unavailable")

    async def wait_for_next_interval(seconds: int) -> None:
        assert seconds == cleanup_module.USER_AVATAR_CLEANUP_INTERVAL_SECONDS
        if calls == 1:
            return
        waiting.set()
        await asyncio.Future()

    async def exercise_loop() -> None:
        monkeypatch.setattr(cleanup_module, "run_user_avatar_cleanup_once", cleanup_once)
        monkeypatch.setattr(cleanup_module.asyncio, "sleep", wait_for_next_interval)
        task = asyncio.create_task(cleanup_module.run_user_avatar_cleanup_loop())
        try:
            await asyncio.wait_for(waiting.wait(), timeout=1)
        finally:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    asyncio.run(exercise_loop())

    assert calls == 2
