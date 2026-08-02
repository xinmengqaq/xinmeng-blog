import base64

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BusinessException
from app.core.response_codes import ResponseCode
from app.modules.auth.models import Admin

def decode_token(token: str) -> dict:
    # 验签 + 解码：HS256 + Base64 解码密钥 + leeway  120 秒时钟偏移
    # 只接收 token 字符串
    try:
        key = base64.b64decode(settings.jwt_secret)
        # decode 方法会验证 token 的签名和过期时间，如果验证失败会抛出异常，如果成功返回字典 token 中的 原始数据
        return jwt.decode(
            token,
            key,
            algorithms=["HS256"],
            leeway=settings.jwt_clock_skew_seconds,
            options={"require": ["sub", "passwordVersion", "iat", "exp"]},
        )
    except jwt.PyJWTError as e:
        raise BusinessException(
            code=ResponseCode.UNAUTHORIZED,
            message="登录已过期，请重新登录",
        ) from e

async def get_admin_by_id(admin_id: int, session: AsyncSession) -> Admin | None:
    stmt = select(Admin).where(Admin.id == admin_id)
    return (await session.execute(stmt)).scalar_one_or_none()

async def authenticate(token: str, session: AsyncSession) -> int:
    claims = decode_token(token)
    try:
        admin_id = int(claims["sub"])
        token_password_version = int(claims["passwordVersion"])
    except (KeyError, TypeError, ValueError) as e:
        raise BusinessException(
            code=ResponseCode.UNAUTHORIZED,
            message="登录已过期，请重新登录",
        ) from e
    admin = await get_admin_by_id(admin_id, session)
    if admin is None:
        raise BusinessException(code=ResponseCode.NOT_FOUND, message="管理员不存在")

    if token_password_version != admin.password_version:
        raise BusinessException(
            code=ResponseCode.UNAUTHORIZED,
            message="登录已过期，请重新登录",
        )

    return admin.id
