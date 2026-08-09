from app.db.base import Base

from sqlalchemy import BigInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column


class Article(Base):
    # 文章表名, 对应数据库中的 article 表
    __tablename__ = "article"

    # 文章主键, 对应数据库中的 id 字段
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    # 文章封面 URL 可为空, 所以用 | None 表示允许 NULL
    cover_url: Mapped[str | None] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)


class SiteConfig(Base):
    # 站点配置表：文件模块只映射并更新授权字段 background_url
    __tablename__ = "site_config"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    background_url: Mapped[str | None] = mapped_column(String(500))
