from typing import Annotated

from fastapi import Depends

from app.core.paths import STORAGE_DIR
from app.modules.file.storage.base import StorageBackend
from app.modules.file.storage.local_disk import LocalStorage



def get_storage_backend() -> StorageBackend:
    # 正文图片存储后端
    return LocalStorage(
        base_dir=str(STORAGE_DIR / "articles" / "content"),
        base_url="/files/articles/content",
    )

def get_article_cover_storage() -> StorageBackend:
    # 文章封面存储：独立目录，和正文图片分开
    return LocalStorage(
        base_dir=str(STORAGE_DIR / "articles" / "cover"),
        base_url="/files/articles/cover",
    )


def get_admin_avatar_storage() -> StorageBackend:
    # 管理员头像地址
    return  LocalStorage(
        base_dir=str(STORAGE_DIR / "admins" / "avatar"),
        base_url = "/files/admins/avatar",
    )


def get_user_avatar_storage() -> StorageBackend:
    return LocalStorage(
        base_dir=str(STORAGE_DIR / "users" / "avatar"),
        base_url="/files/users/avatar",
    )


def get_site_background_storage() -> StorageBackend:
    # 前台头图/背景图：独立目录，与封面、头像隔离
    return LocalStorage(
        base_dir=str(STORAGE_DIR / "site" / "background"),
        base_url="/files/site/background",
    )

# StorageDep 把抽象类型与 Depends 声明绑定，路由参数可以直接复用这份依赖契约。
StorageDep = Annotated[StorageBackend, Depends(get_storage_backend)]

#封面图片地址依赖注入
ArticleCoverStorageDep = Annotated[StorageBackend, Depends(get_article_cover_storage)]

# 管理员头像依赖注入
AdminAvatarStorageDep = Annotated[StorageBackend, Depends(get_admin_avatar_storage)]

UserAvatarStorageDep = Annotated[StorageBackend, Depends(get_user_avatar_storage)]

# 站点头图依赖注入
SiteBackgroundStorageDep = Annotated[StorageBackend, Depends(get_site_background_storage)]
