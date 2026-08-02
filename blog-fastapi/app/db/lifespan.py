from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db.session import engine

# 数据库连接生命周期管理
# 应用启动时创建数据库连接，应用关闭时关闭数据库连接
# 数据库连接在应用运行时保持打开状态，避免频繁创建和销毁连接
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()