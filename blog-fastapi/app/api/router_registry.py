from fastapi import FastAPI

from app.modules.file.router import (
    admin_router,
    user_router,
)
from app.modules.music.router import admin_router as music_admin_router
from app.modules.music.router import public_router as music_public_router


class RouterRegistry:
    # 集中装配路由可让应用入口只负责初始化对象，模块路由仍由各自模块维护。
    # include_router 会把模块前缀、标签和路径统一合并到应用路由表。

    def __init__(self, app: FastAPI):
        self.app = app

    def register_all(self) -> None:
        # 全局前缀用于区分后台接口，模块前缀用于表达资源所属领域。
        # 多层前缀会按路由装配顺序合并为最终访问路径。
        self.app.include_router(admin_router, prefix="/api/admin/files")
        self.app.include_router(user_router, prefix="/api/user/files")
        self.app.include_router(music_admin_router, prefix="/api/admin/music")
        self.app.include_router(music_public_router, prefix="/api/music")
