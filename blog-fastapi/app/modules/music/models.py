from datetime import datetime

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Music(Base):
    # 音乐表：管理员上传的本地 MP3 及其基础业务信息
    __tablename__ = "music"
    __table_args__ = (
        # duration_ms 必须大于 0
        CheckConstraint("duration_ms > 0", name="duration_positive"),
        # 播放列表固定按 created_at ASC, id ASC 排序，联合索引覆盖稳定分页
        Index("ix_music_created_id", "created_at", "id"),
        {"comment": "音乐表：管理员上传的本地 MP3 及基础业务信息"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, comment="音乐 ID")
    # 歌曲名：去除首尾空格后不能为空，约束由 service 校验层保证
    title: Mapped[str] = mapped_column(String(120), comment="歌曲名")
    # 歌手：可空
    artist: Mapped[str | None] = mapped_column(String(120), comment="歌手")
    # 文件模块返回的 MP3 地址，唯一防止同一文件重复登记
    audio_url: Mapped[str] = mapped_column(String(500), unique=True, comment="文件模块返回的 MP3 地址")
    # Mutagen 解析出的毫秒时长，必须大于 0
    duration_ms: Mapped[int] = mapped_column(Integer, comment="Mutagen 解析出的毫秒时长")
    # 是否出现在访客列表，默认启用
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", comment="是否出现在访客列表")
    # 上传顺序和创建时间，数据库侧默认当前时间
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), comment="创建时间"
    )
    # 最后修改时间，数据库侧默认当前时间
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), comment="最后修改时间"
    )
