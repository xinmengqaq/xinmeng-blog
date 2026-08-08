from fastapi import APIRouter

from app.modules.file.image.router import (
    _read_upload_content,
    profile_router,
    router as article_router,
    site_config_router,
    user_profile_router,
)


admin_router = APIRouter()
admin_router.include_router(article_router)
admin_router.include_router(profile_router)
admin_router.include_router(site_config_router)

user_router = APIRouter()
user_router.include_router(user_profile_router)

router = admin_router

__all__ = ["_read_upload_content", "admin_router", "router", "user_router"]
