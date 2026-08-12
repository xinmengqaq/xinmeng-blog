from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.music.models import Music

MAX_TITLE_LENGTH = 120
MAX_ARTIST_LENGTH = 120


class CreateMusicData(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    title: str
    artist: str | None = None

    @field_validator("title")
    @classmethod
    def _validate_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("歌曲名不能为空")
        if len(value) > MAX_TITLE_LENGTH:
            raise ValueError("歌曲名过长")
        return value

    @field_validator("artist")
    @classmethod
    def _normalize_artist(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if len(value) > MAX_ARTIST_LENGTH:
            raise ValueError("歌手过长")
        return value


class MusicQuery(BaseModel):
    # 分页参数：page 从 1 开始，page_size 限制在 1–100，由 Pydantic 完成校验。
    model_config = ConfigDict(extra="forbid")

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class MusicUpdate(BaseModel):
    # 局部更新：只提交允许字段；标题不能清空，空歌手归一为 NULL，至少提供一个字段。
    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    artist: str | None = None
    is_enabled: bool | None = None

    @field_validator("title")
    @classmethod
    def _normalize_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()

    @field_validator("artist")
    @classmethod
    def _normalize_artist(cls, value: str | None) -> str | None:
        # 空字符串或纯空格按 NULL 保存，避免写入只含空格的歌手。
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if len(value) > MAX_ARTIST_LENGTH:
            raise ValueError("歌手过长")
        return value

    @model_validator(mode="after")
    def _validate_submitted_fields(self) -> "MusicUpdate":
        if not self.model_fields_set:
            raise ValueError("至少提供一个可修改字段")
        if "title" in self.model_fields_set:
            title = self.title
            if title is None or not title:
                raise ValueError("歌曲名不能清空")
            if len(title) > MAX_TITLE_LENGTH:
                raise ValueError("歌曲名过长")
        return self


class MusicUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: MusicUpdate


class AdminMusic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    artist: str | None
    audio_url: str
    duration_ms: int
    is_enabled: bool
    created_at: datetime
    updated_at: datetime


class PublicMusic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    artist: str | None
    audio_url: str
    duration_ms: int


class AdminMusicPage(BaseModel):
    items: list[AdminMusic]
    page: int
    page_size: int
    total: int
    total_pages: int


class PublicMusicPage(BaseModel):
    items: list[PublicMusic]
    page: int
    page_size: int
    total: int
    total_pages: int


class MusicPage(BaseModel):
    # 分页结果：items 保持 service 返回的 ORM 实体，不在此重复做响应级解析；
    # 具体响应模型由 Task 6 的 HTTP 层按管理员/公开两类契约输出。
    model_config = ConfigDict(arbitrary_types_allowed=True)

    items: list[Music]
    page: int
    page_size: int
    total: int
    total_pages: int
