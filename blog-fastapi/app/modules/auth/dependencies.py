from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import BusinessException
from app.core.response_codes import ResponseCode
from app.db.session import SessionDep
from app.modules.auth.service import authenticate

# HTTPBearer 从 Authorization: Bearer <token> 提取 token，并在 OpenAPI 声明安全方案
# auto_error=False：缺失时不让框架自动返回 403，返回 None 交给本依赖统一抛业务异常
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    session: SessionDep,
) -> int:
    # 依赖层只做两件事：判断凭证存在 -> 把 token 字符串交给 service
    # 验签、查库、比对全在 service.authenticate，本函数不处理业务规则
    if credentials is None:
        raise BusinessException(code=ResponseCode.UNAUTHORIZED, message="未登录")
    return await authenticate(credentials.credentials, session)


# 路由用 admin_id: CurrentAdminId 即注入当前管理员 ID（第六阶段文件接口接上）
CurrentAdminId = Annotated[int, Depends(get_current_admin)]

