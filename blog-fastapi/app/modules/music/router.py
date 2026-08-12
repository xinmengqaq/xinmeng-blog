from typing import Annotated

from fastapi import APIRouter, File, Form, Query, UploadFile
from pydantic import Json

from app.core.schemas import ApiResponse
from app.modules.auth.dependencies import CurrentAdminId
from app.modules.music.dependencies import MusicServiceDep
from app.modules.music.schemas import (
    AdminMusic,
    AdminMusicPage,
    CreateMusicData,
    MusicQuery,
    MusicUpdateRequest,
    PublicMusicPage,
)

admin_router = APIRouter(prefix="/tracks", tags=["音乐管理"])
public_router = APIRouter(prefix="/tracks", tags=["音乐"])


@admin_router.post(
    "",
    response_model=ApiResponse[AdminMusic],
    summary="创建音乐",
    description="接收 Pydantic data 与 MP3 文件，创建并返回默认启用的音乐记录。",
)
# 创建音乐：data 负责业务字段校验，file 由音频文件子系统校验和保存。
async def create_music(
    data: Annotated[Json[CreateMusicData], Form()],
    file: Annotated[UploadFile, File()],
    service: MusicServiceDep,
    _admin_id: CurrentAdminId,
):
    return ApiResponse(data=await service.create(data, file))


@admin_router.get(
    "",
    response_model=ApiResponse[AdminMusicPage],
    summary="查询全部音乐",
    description="按分页条件返回全部音乐记录，包括已停用音乐。",
)
# 管理员列表：保留停用记录，供后台管理和恢复启用状态。
async def list_admin_music(
    query: Annotated[MusicQuery, Query()],
    service: MusicServiceDep,
    _admin_id: CurrentAdminId,
):
    return ApiResponse(data=await service.list_music(query, include_disabled=True))


@admin_router.get(
    "/{music_id}",
    response_model=ApiResponse[AdminMusic],
    summary="查询音乐详情",
    description="根据路径中的 music_id 返回单条管理员音乐详情。",
)
# 音乐详情：路径只传 music_id，不要求客户端回传完整音乐数据。
async def get_music(music_id: int, service: MusicServiceDep, _admin_id: CurrentAdminId):
    return ApiResponse(data=await service.get_music(music_id))


@admin_router.patch(
    "/{music_id}",
    response_model=ApiResponse[AdminMusic],
    summary="修改音乐",
    description="根据 music_id 和 Pydantic data 局部修改歌曲名、歌手或启用状态。",
)
# 局部修改：music_id 定位记录，data 只承载允许修改的字段。
async def update_music(
    music_id: int,
    request: MusicUpdateRequest,
    service: MusicServiceDep,
    _admin_id: CurrentAdminId,
):
    return ApiResponse(data=await service.update_music(music_id, request.data))


@admin_router.delete(
    "/{music_id}",
    response_model=ApiResponse[None],
    summary="删除音乐",
    description="根据 music_id 停用音乐、清理音频文件并删除数据库记录。",
)
# 删除音乐：service 保证先停用、再清理文件、最后删除记录的顺序。
async def delete_music(music_id: int, service: MusicServiceDep, _admin_id: CurrentAdminId):
    await service.delete_music(music_id)
    return ApiResponse(data=None)


@public_router.get(
    "",
    response_model=ApiResponse[PublicMusicPage],
    summary="查询公开音乐列表",
    description="按分页条件返回访客可播放的已启用音乐，不包含管理字段。",
)
# 公开列表：只返回已启用音乐，并通过响应模型过滤管理字段。
async def list_public_music(query: Annotated[MusicQuery, Query()], service: MusicServiceDep):
    return ApiResponse(data=await service.list_music(query))
