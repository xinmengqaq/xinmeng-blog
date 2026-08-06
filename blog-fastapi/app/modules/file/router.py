from typing import Annotated

from fastapi import APIRouter, File, UploadFile
from fastapi.params import Depends

from app.core.schemas import ApiResponse
from app.db.session import SessionDep
from app.modules.auth.dependencies import get_current_admin, CurrentAdminId
from app.modules.file.schemas import (
    ContentImageCleanupRequest,
    ContentImageCleanupResponse,
    ContentImageResponse,
    CoverImageResponse,
    AvatarResponse,
    BackgroundResponse,
)
from app.modules.file.service import (
    MAX_CONTENT_IMAGE_SIZE,
    cleanup_content_image,
    prepare_image,
    remove_admin_avatar,
    remove_article_cover,
    remove_site_background,
    update_article_cover,
    update_admin_avatar,
    update_site_background,
)
from app.modules.file.storage.dependencies import (
    ArticleCoverStorageDep,
    StorageDep,
    AdminAvatarStorageDep,
    SiteBackgroundStorageDep,
)

# APIRouter 的 prefix 会作用于该路由器下的每个路径，tags 用于文档分组。
# 模块前缀和路由路径分别表达资源归属与具体动作，组合后形成完整 URL。
router = APIRouter(prefix="/articles", tags=["文件"], dependencies=[Depends(get_current_admin)],)


async def _read_upload_content(file: UploadFile) -> bytes:
    return await file.read(MAX_CONTENT_IMAGE_SIZE + 1)


@router.post(
    "/content-images",
    summary="上传文章正文图片",
    description="上传图片到正文图片目录，返回可写入文章正文的图片地址。"
                "第一版允许 jpg/jpeg/png/webp/gif，单张大小由配置限制。",
    response_model=ApiResponse[ContentImageResponse],
)
async def upload_content_image(
    file: Annotated[UploadFile, File(
        description="正文图片文件",
        openapi_examples={
            "normal_png": {
                "summary": "正常 PNG 图片",
                "value": "content-image.png",
            },
        },
    )],
    storage: StorageDep
) -> ApiResponse[ContentImageResponse]:
    # 多读一字节用于识别超限文件，避免把任意大小的上传完整载入内存。
    content = await _read_upload_content(file)

    # 准备：校验 + 命名；失败抛 BusinessException，处理器统一返回业务 code
    image = prepare_image(
        file.filename or "",
        file.content_type or "",
        content,
        allow_gif=True,
    )

    # 存储：失败抛 SystemException，处理器统一返回 code="500"
    file_url = await storage.save(image.content, image.stored_name)

    return ApiResponse(data=ContentImageResponse(file_url=file_url))


@router.delete(
    "/content-images",
    summary="清理未引用正文图片",
    description="检查文章正文引用后，删除未被引用的正文图片文件。",
    response_model=ApiResponse[ContentImageCleanupResponse],
)
async def delete_content_image(
    request: ContentImageCleanupRequest,
    session: SessionDep,
    storage: StorageDep,
) -> ApiResponse[ContentImageCleanupResponse]:
    result = await cleanup_content_image(request.file_url, storage, session)
    return ApiResponse(data=ContentImageCleanupResponse(result=result))


@router.put(
    "/{article_id}/cover",
    summary="上传文章封面",
    description="上传图片并更新指定文章的封面地址，替换旧封面。",
    response_model=ApiResponse[CoverImageResponse],
)
async def upload_article_cover(
    article_id: int,                                    # 路径参数，FastAPI 自动转 int，非数字 422->400
    file: Annotated[UploadFile, File(description="文章封面图片")],
    session: SessionDep,                                # 数据库会话，依赖注入
    storage: ArticleCoverStorageDep,                    # 封面存储后端，依赖注入
) -> ApiResponse[CoverImageResponse]:
    content = await _read_upload_content(file)
    file_url = await update_article_cover(
        article_id, file.filename or "", file.content_type or "", content, storage, session,
    )
    return ApiResponse(data=CoverImageResponse(file_url=file_url))


@router.delete(
    "/{article_id}/cover",
    summary="删除文章封面",
    description="清空指定文章的封面地址，并尝试清理本系统保存的旧封面文件。",
    response_model=ApiResponse[None],
)
async def delete_article_cover(
    article_id: int,
    session: SessionDep,
    storage: ArticleCoverStorageDep,
) -> ApiResponse[None]:
    await remove_article_cover(article_id, storage, session)
    return ApiResponse(data=None)



profile_router = APIRouter(prefix="/profile", tags=["文件"])


@profile_router.put(
    "/avatar",
    summary="上传管理员头像",
    description="上传图片并更新当前登录管理员的头像地址，替换旧头像。",
    response_model=ApiResponse[AvatarResponse],
)
async def upload_avatar(
    admin_id: CurrentAdminId,                              # 身份来源：JWT 的 sub，不是客户端参数
    file: Annotated[UploadFile, File(description="管理员头像图片")],
    session: SessionDep,
    storage: AdminAvatarStorageDep,
) -> ApiResponse[AvatarResponse]:
    content = await _read_upload_content(file)
    file_url = await update_admin_avatar(
        admin_id, file.filename or "", file.content_type or "", content, storage, session,
    )
    return ApiResponse(data=AvatarResponse(file_url=file_url))


@profile_router.delete(
    "/avatar",
    summary="删除管理员头像",
    description="清空当前登录管理员的头像地址，并尝试清理本系统保存的旧头像文件。",
    response_model=ApiResponse[None],
)
async def delete_avatar(
    admin_id: CurrentAdminId,
    session: SessionDep,
    storage: AdminAvatarStorageDep,
) -> ApiResponse[None]:
    await remove_admin_avatar(admin_id, storage, session)
    return ApiResponse(data=None)

site_config_router = APIRouter(
    prefix="/site-config",
    tags=["文件"],
    dependencies=[Depends(get_current_admin)],
)


@site_config_router.put(
    "/background",
    summary="上传前台头图",
    description="上传图片并更新站点配置的背景图地址，替换旧头图。",
    response_model=ApiResponse[BackgroundResponse],
)
async def upload_site_background(
    file: Annotated[UploadFile, File(description="前台头图图片")],
    session: SessionDep,
    storage: SiteBackgroundStorageDep,
) -> ApiResponse[BackgroundResponse]:
    content = await _read_upload_content(file)
    file_url = await update_site_background(
        file.filename or "", file.content_type or "", content, storage, session,
    )
    return ApiResponse(data=BackgroundResponse(file_url=file_url))


@site_config_router.delete(
    "/background",
    summary="删除前台头图",
    description="清空站点背景图地址，并尝试清理本系统保存的旧头图文件。",
    response_model=ApiResponse[None],
)
async def delete_site_background(
    session: SessionDep,
    storage: SiteBackgroundStorageDep,
) -> ApiResponse[None]:
    await remove_site_background(storage, session)
    return ApiResponse(data=None)
