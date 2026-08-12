from typing import Annotated

from fastapi import Depends

from app.db.session import SessionDep
from app.modules.file.image.service import ImageService
from app.modules.file.storage.dependencies import (
    AdminAvatarStorageDep,
    ArticleCoverStorageDep,
    SiteBackgroundStorageDep,
    StorageDep,
    UserAvatarStorageDep,
)


def get_content_image_service(
    session: SessionDep,
    storage: StorageDep,
) -> ImageService:
    return ImageService(session=session, storage=storage)


def get_article_cover_image_service(
    session: SessionDep,
    storage: ArticleCoverStorageDep,
) -> ImageService:
    return ImageService(session=session, storage=storage)


def get_admin_avatar_image_service(
    session: SessionDep,
    storage: AdminAvatarStorageDep,
) -> ImageService:
    return ImageService(session=session, storage=storage)


def get_user_avatar_image_service(
    session: SessionDep,
    storage: UserAvatarStorageDep,
) -> ImageService:
    return ImageService(session=session, storage=storage)


def get_site_background_image_service(
    session: SessionDep,
    storage: SiteBackgroundStorageDep,
) -> ImageService:
    return ImageService(session=session, storage=storage)


ContentImageServiceDep = Annotated[ImageService, Depends(get_content_image_service)]
ArticleCoverImageServiceDep = Annotated[ImageService, Depends(get_article_cover_image_service)]
AdminAvatarImageServiceDep = Annotated[ImageService, Depends(get_admin_avatar_image_service)]
UserAvatarImageServiceDep = Annotated[ImageService, Depends(get_user_avatar_image_service)]
SiteBackgroundImageServiceDep = Annotated[ImageService, Depends(get_site_background_image_service)]
