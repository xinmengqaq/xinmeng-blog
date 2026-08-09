from fastapi import FastAPI

from app.modules.file.router import (
    router as file_router,
    profile_router,
    site_config_router,
)


class RouterRegistry:
    # 集中装配路由可让应用入口只负责初始化对象，模块路由仍由各自模块维护。
    # include_router 会把模块前缀、标签和路径统一合并到应用路由表。

    def __init__(self, app: FastAPI):
        self.app = app

    def register_all(self) -> None:
        # 全局前缀用于区分后台接口，模块前缀用于表达资源所属领域。
        # 多层前缀会按路由装配顺序合并为最终访问路径。
        self.app.include_router(file_router, prefix="/api/admin/files")
        self.app.include_router(profile_router, prefix="/api/admin/files")
        self.app.include_router(site_config_router, prefix="/api/admin/files")
