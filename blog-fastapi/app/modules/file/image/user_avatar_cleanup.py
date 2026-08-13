import asyncio
from datetime import datetime, timedelta, timezone

from loguru import logger
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.modules.file.storage.dependencies import get_user_avatar_storage
from app.modules.file.storage.local_disk import LocalStorage
from app.modules.user.models import BlogUser


USER_AVATAR_CLEANUP_INTERVAL_SECONDS = 60 * 60
USER_AVATAR_CLEANUP_BATCH_SIZE = 100
USER_AVATAR_MIN_AGE = timedelta(hours=1)


async def _referenced_avatar_urls(
    session: AsyncSession,
    file_urls: list[str],
) -> set[str]:
    result = await session.execute(
        select(BlogUser.avatar).where(BlogUser.avatar.in_(file_urls)),
    )
    return set(result.scalars().all())


async def cleanup_orphan_user_avatars(
    session: AsyncSession,
    storage: LocalStorage,
    *,
    now: datetime | None = None,
) -> int:
    cleanup_time = now or datetime.now(timezone.utc)
    try:
        candidate_urls = await storage.list_file_urls_older_than(
            cleanup_time - USER_AVATAR_MIN_AGE,
            USER_AVATAR_CLEANUP_BATCH_SIZE,
        )
    except OSError as exc:
        logger.warning(
            "普通用户头像孤儿扫描失败: result=scan_failed, error_type={}",
            type(exc).__name__,
        )
        return 0

    if not candidate_urls:
        return 0

    try:
        referenced_urls = await _referenced_avatar_urls(session, candidate_urls)
        orphan_urls = [url for url in candidate_urls if url not in referenced_urls]
        if not orphan_urls:
            return 0
        referenced_urls = await _referenced_avatar_urls(session, orphan_urls)
    except SQLAlchemyError as exc:
        await session.rollback()
        logger.warning(
            "普通用户头像孤儿清理跳过: result=reference_query_failed, error_type={}",
            type(exc).__name__,
        )
        return 0

    deleted_count = 0
    for file_url in orphan_urls:
        if file_url in referenced_urls:
            continue
        try:
            if await storage.delete(file_url):
                deleted_count += 1
        except OSError as exc:
            logger.warning(
                "普通用户头像孤儿清理失败: result=delete_failed, error_type={}",
                type(exc).__name__,
            )
    return deleted_count


async def run_user_avatar_cleanup_once() -> int:
    storage = get_user_avatar_storage()
    if not isinstance(storage, LocalStorage):
        logger.warning("普通用户头像孤儿清理跳过: result=unsupported_storage")
        return 0

    async with async_session_factory() as session:
        deleted_count = await cleanup_orphan_user_avatars(session, storage)

    if deleted_count:
        logger.info("普通用户头像孤儿清理完成: deleted_count={}", deleted_count)
    return deleted_count


async def run_user_avatar_cleanup_loop() -> None:
    while True:
        try:
            await run_user_avatar_cleanup_once()
        except (OSError, SQLAlchemyError) as exc:
            logger.warning(
                "普通用户头像孤儿清理跳过: result=cleanup_failed, error_type={}",
                type(exc).__name__,
            )
        await asyncio.sleep(USER_AVATAR_CLEANUP_INTERVAL_SECONDS)
