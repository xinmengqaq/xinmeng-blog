from sqlalchemy import BigInteger,String,Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Admin(Base):

    __tablename__ = "admin"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str] = mapped_column(String(50))
    password_version: Mapped[int] = mapped_column(Integer)
    avatar: Mapped[str | None] = mapped_column(String(255), nullable=True)
