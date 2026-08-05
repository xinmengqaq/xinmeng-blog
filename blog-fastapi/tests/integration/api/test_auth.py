import base64
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, Mock

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.session import get_db_session
from app.main import app
from app.modules.auth.dependencies import CurrentAdminId
from app.modules.auth.models import Admin


# ============ 测试端点：临时挂在 app 上，用 CurrentAdminId 保护 ============
# 第五阶段不建 auth 路由模块，测试里临时挂一个受保护端点验证鉴权依赖是否拦截。
# 路径 /api/admin/test-protected 不会被生产访问，测试结束后路由残留无害。
@app.get("/api/admin/test-protected")
async def _test_protected_endpoint(admin_id: CurrentAdminId):
    # 认证依赖放行后才进到这里；admin_id 是验过签的管理员 ID
    return {"code": "200", "message": "请求成功", "data": {"admin_id": admin_id}}


# raise_server_exceptions=False 让兜底处理器正常返回响应，不把异常 re-raise 到测试代码
client = TestClient(app, raise_server_exceptions=False)


# ============ 辅助函数 ============

def _make_token(
    *,
    admin_id: int | str = 1,
    password_version: int | str = 1,
    expired: bool = False,
    wrong_key: bool = False,
    omitted_claim: str | None = None,
) -> str:
    # 用与 Spring Boot 相同的规则签发测试 token
    # claim 名必须与 Spring Boot JwtUtils.createToken 严格一致：sub/username/passwordVersion
    now = datetime.now(timezone.utc)
    if expired:
        exp = now - timedelta(hours=1)  # 1 小时前过期，远超 leeway=120 秒
    else:
        exp = now + timedelta(hours=1)

    payload = {
        "sub": str(admin_id),
        "username": "admin",
        "passwordVersion": password_version,
        "iat": now,
        "exp": exp,
    }
    if omitted_claim is not None:
        payload.pop(omitted_claim)

    if wrong_key:
        # 用错误密钥签发，FastAPI 用正确密钥验签会失败
        key = b"wrong-secret-key-for-testing-32b!"
    else:
        # 与 Spring Boot 一致：密钥是 Base64 编码字符串，用前先解码
        key = base64.b64decode(settings.jwt_secret)

    return jwt.encode(payload, key, algorithm="HS256")


def _make_mock_session(admin: Admin | None = None) -> AsyncMock:
    # 构造 mock 数据库会话，控制查 admin 表的返回结果
    # authenticate -> get_admin_by_id -> (await session.execute(stmt)).scalar_one_or_none()
    session = AsyncMock()
    result = Mock()
    result.scalar_one_or_none = Mock(return_value=admin)
    session.execute.return_value = result
    return session


def _override_db(admin: Admin | None = None) -> None:
    # 覆盖数据库会话依赖，让查 admin 表返回指定的 admin（或 None）
    session = _make_mock_session(admin)

    async def _override():
        yield session

    app.dependency_overrides[get_db_session] = _override


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ============ autouse fixture：每个测试自动覆盖数据库，避免连真实库 ============

@pytest.fixture(autouse=True)
def _isolate_db():
    # 每个测试前覆盖数据库（默认查 admin 返回 None），测试后清除覆盖
    # 不查库的测试（缺失头/格式错/签名错/过期）不会连真实库
    # 需要控制 admin 返回的测试在测试体内再调 _override_db(admin)
    _override_db()
    yield
    _clear_overrides()


# ============ 测试用例 ============


def test_valid_token_passes():
    # 有效 token + 管理员存在 + 密码版本一致 -> 放行，返回管理员 ID
    _override_db(Admin(id=1, username="admin", password_version=1))
    token = _make_token(admin_id=1, password_version=1)

    response = client.get("/api/admin/test-protected", headers=_auth_headers(token))

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "200"
    assert body["message"] == "请求成功"
    assert body["data"]["admin_id"] == 1


def test_missing_authorization_header():
    # 没带 Authorization 头 -> HTTPBearer 返回 None -> 抛 401 "未登录"
    response = client.get("/api/admin/test-protected")

    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "401"
    assert body["message"] == "未登录"
    assert body["data"] is None


def test_invalid_token_format():
    # token 不是合法 JWT 格式 -> PyJWT 解析失败 -> 401
    response = client.get(
        "/api/admin/test-protected",
        headers=_auth_headers("not.a.valid.jwt"),
    )

    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "401"
    assert body["message"] == "登录已过期，请重新登录"
    assert body["data"] is None


def test_wrong_signature():
    # 用错误密钥签发的 token -> 验签失败 -> 401
    token = _make_token(wrong_key=True)
    response = client.get("/api/admin/test-protected", headers=_auth_headers(token))

    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "401"
    assert body["message"] == "登录已过期，请重新登录"
    assert body["data"] is None


def test_expired_token():
    # 过期 token -> PyJWT 校验 exp 失败 -> 401
    token = _make_token(expired=True)
    response = client.get("/api/admin/test-protected", headers=_auth_headers(token))

    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "401"
    assert body["message"] == "登录已过期，请重新登录"
    assert body["data"] is None


@pytest.mark.parametrize("omitted_claim", ["sub", "passwordVersion", "iat", "exp"])
def test_missing_required_claim_returns_unauthorized(omitted_claim):
    token = _make_token(omitted_claim=omitted_claim)

    response = client.get("/api/admin/test-protected", headers=_auth_headers(token))

    assert response.status_code == 401
    assert response.json() == {
        "code": "401",
        "message": "登录已过期，请重新登录",
        "data": None,
    }


@pytest.mark.parametrize(
    ("admin_id", "password_version"),
    [("invalid", 1), (1, "invalid")],
)
def test_invalid_required_claim_type_returns_unauthorized(admin_id, password_version):
    token = _make_token(admin_id=admin_id, password_version=password_version)

    response = client.get("/api/admin/test-protected", headers=_auth_headers(token))

    assert response.status_code == 401
    assert response.json() == {
        "code": "401",
        "message": "登录已过期，请重新登录",
        "data": None,
    }


def test_admin_not_found():
    # token 有效但管理员已被删除 -> 查库返回 None -> 404
    _override_db(admin=None)
    token = _make_token(admin_id=999, password_version=1)

    response = client.get("/api/admin/test-protected", headers=_auth_headers(token))

    assert response.status_code == 404
    body = response.json()
    assert body["code"] == "404"
    assert body["message"] == "管理员不存在"
    assert body["data"] is None


def test_password_version_mismatch():
    # token 里 passwordVersion=1，但数据库 password_version=2（改过密码了）-> 401
    _override_db(Admin(id=1, username="admin", password_version=2))
    token = _make_token(admin_id=1, password_version=1)

    response = client.get("/api/admin/test-protected", headers=_auth_headers(token))

    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "401"
    assert body["message"] == "登录已过期，请重新登录"
    assert body["data"] is None
