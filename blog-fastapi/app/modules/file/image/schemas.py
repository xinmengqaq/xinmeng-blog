from pydantic import BaseModel, Field

from app.modules.file.image.enums import ContentImageCleanupResult


class ContentImageResponse(BaseModel):

    # 供客户端写入文章正文的可访问图片地址。
    file_url: str


class ContentImageCleanupRequest(BaseModel):
    file_url: str = Field(min_length=1, max_length=500)


class ContentImageCleanupResponse(BaseModel):
    result: ContentImageCleanupResult


class CoverImageResponse(BaseModel):

    # 封面图片URL
    file_url: str

class AvatarResponse(BaseModel):

    # 管理员图片URL
    file_url: str


class BackgroundResponse(BaseModel):

    # 前台头图/背景图 URL
    file_url: str
