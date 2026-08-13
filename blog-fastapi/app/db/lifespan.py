import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI

from app.db.session import engine
from app.modules.file.image.user_avatar_cleanup import run_user_avatar_cleanup_loop

# 数据库连接生命周期管理
# 应用启动时创建数据库连接，应用关闭时关闭数据库连接
# 数据库连接在应用运行时保持打开状态，避免频繁创建和销毁连接
@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_task = asyncio.create_task(
        run_user_avatar_cleanup_loop(),
        name="user-avatar-orphan-cleanup",
    )
    try:
        yield
    finally:
        cleanup_task.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup_task
        await engine.dispose()
