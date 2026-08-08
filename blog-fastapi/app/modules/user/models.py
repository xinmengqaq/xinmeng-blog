from sqlalchemy import BigInteger, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BlogUser(Base):
    __tablename__ = "blog_user"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    avatar: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32))
    password_version: Mapped[int] = mapped_column(Integer)
