from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.core.exceptions import BusinessException
from app.core.response_codes import ResponseCode
from app.db.session import SessionDep
from app.modules.auth.service import decode_token
from app.modules.user.models import BlogUser

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    session: SessionDep,
) -> int:
    if credentials is None:
        raise BusinessException(code=ResponseCode.UNAUTHORIZED, message="未登录")
    claims = decode_token(credentials.credentials)
    try:
        user_id = int(claims["sub"])
        token_password_version = int(claims["passwordVersion"])
        principal_type = claims["principalType"]
    except (KeyError, TypeError, ValueError) as e:
        raise BusinessException(code=ResponseCode.UNAUTHORIZED, message="登录已过期，请重新登录") from e
    if principal_type != "user":
        raise BusinessException(code=ResponseCode.UNAUTHORIZED, message="登录已过期，请重新登录")
    user = (await session.execute(select(BlogUser).where(BlogUser.id == user_id))).scalar_one_or_none()
    if user is None:
        raise BusinessException(code=ResponseCode.NOT_FOUND, message="用户不存在")
    if user.status != "enabled" or token_password_version != user.password_version:
        raise BusinessException(code=ResponseCode.UNAUTHORIZED, message="登录已过期，请重新登录")
    return user.id


CurrentUserId = Annotated[int, Depends(get_current_user)]
