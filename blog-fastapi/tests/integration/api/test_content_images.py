import asyncio
import io
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.exceptions import SystemException
from app.db.session import get_db_session
from app.modules.auth.dependencies import get_current_admin
from app.modules.file.storage.base import StorageBackend
from app.modules.file.storage.dependencies import get_storage_backend
from app.modules.file.storage.local_disk import LocalStorage
from app.main import app

#在内存中生成 1x1 最小合法 PNG 二进制
def _make_png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="PNG")
    return buf.getvalue()


def _make_webp_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="WEBP")
    return buf.getvalue()


def _make_gif_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="GIF")
    return buf.getvalue()

# 测试客户端，模块级创建 TestClient 实例，避免每个测试函数都创建实例，后续可直接调用 app 的 ASGI 接口
# raise_server_exceptions=False 让兜底 Exception 处理器正常返回响应，而不是把异常 re-raise 到测试代码
client = TestClient(app, raise_server_exceptions=False)

TEST_URL = settings.database_url.replace("springboot_vue", "springboot_vue_test")
test_engine = create_async_engine(TEST_URL, echo=False, poolclass=NullPool)
test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


@pytest.fixture(autouse=True)
def _skip_auth():
    # 文件业务测试跳过鉴权（鉴权在 test_auth.py 已测）
    # 不跳过的话所有测试都被 401 挡住，测不到文件校验和存储
    async def _override() -> int:
        return 1
    app.dependency_overrides[get_current_admin] = _override
    yield
    app.dependency_overrides.pop(get_current_admin, None)


async def _insert_article(content: str) -> int:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            result = await session.execute(
                text(
                    "INSERT INTO article (title, content, status, created_at, updated_at) "
                    "VALUES ('content cleanup test', :content, 'draft', now(), now()) "
                    "RETURNING id"
                ),
                {"content": content},
            )
            await session.commit()
            return result.scalar_one()
    finally:
        await engine.dispose()


async def _delete_article(article_id: int) -> None:
    engine = create_async_engine(TEST_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            await session.execute(text("DELETE FROM article WHERE id = :id"), {"id": article_id})
            await session.commit()
    finally:
        await engine.dispose()


def _override_session() -> None:
    async def _override():
        async with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = _override


# 辅助函数，把存储依赖覆盖为指向临时目录的 LocalStorage。参数 tmp_path 是 pytest 传入的临时目录 Path 对象。
def _override_storage_to_tmp(tmp_path: Path) -> LocalStorage:
    # 创建临时目录 articles/content，用于存储测试文件。
    test_storage = LocalStorage(
        base_dir=str(tmp_path / "articles" / "content"),
        base_url="/files/articles/content",
    )

    # 临时覆盖依赖，测试完成后恢复默认值。
    # 这样可以在测试中使用临时目录存储文件，而不会影响正常运行的存储。
    def _override() -> StorageBackend:
        # 临时返回测试存储实例，测试完成后会自动恢复默认值。
        return test_storage

    #引入依赖覆盖
    app.dependency_overrides[get_storage_backend] = _override
    return test_storage

# 辅助函数，把存储依赖覆盖为模拟失败的存储后端。
def _override_storage_to_fail() -> None:
    # 模拟存储失败的后端，用于测试异常处理。
    class FailStorage(StorageBackend):
        # 模拟存储失败的 save 方法，抛出 SystemException 异常。
        async def save(self, data: bytes, filename: str) -> str:
            raise SystemException(message="测试模拟存储失败")

        async def delete(self, file_url: str) -> bool:
            return False

    # 临时覆盖依赖，测试完成后恢复默认值。
    # 这样可以在测试中使用模拟失败的存储后端，而不会影响正常运行的存储。
    def _override() -> StorageBackend:
        return FailStorage()

    #引入依赖覆盖
    app.dependency_overrides[get_storage_backend] = _override

# 辅助函数，清除所有依赖覆盖。
# 测试完成后调用，确保依赖恢复默认值，避免影响后续测试。
def _clear_overrides() -> None:
    app.dependency_overrides.clear()

# 测试上传内容图片成功, 并返回文件 URL
def test_upload_content_image_success(tmp_path):
    #_override_storage_to_tmp 临时覆盖存储依赖，指向临时目录 articles/content
    _override_storage_to_tmp(tmp_path)
    try:
        # 生成测试 PNG 二进制内容
        content = _make_png_bytes()
        # 上传测试 PNG 二进制内容，调用post接口，返回响应
        response = client.post(
            "/api/admin/files/articles/content-images",
            files={"file": ("test.png", content, "image/png")},
        )
        # 断言响应状态码为 200，即成功
        assert response.status_code == 200
        # 解析响应 JSON 内容
        body = response.json()
        # 断言响应 JSON 内容包含 code="200"，message="请求成功"，data 中包含 file_url 字段，且 file_url 结尾为 .png
        assert body["code"] == "200"
        assert body["message"] == "请求成功"
        assert body["data"]["file_url"] is not None
        assert body["data"]["file_url"].endswith(".png")
    finally:
        # 测试完成后清除所有依赖覆盖，恢复默认值,这是必须的，避免影响真实环境的存储
        _clear_overrides()

@pytest.mark.parametrize(
    ("filename", "content_type", "content_factory"),
    [
        pytest.param("test.webp", "image/webp", _make_webp_bytes, id="webp"),
        pytest.param("test.gif", "image/gif", _make_gif_bytes, id="gif"),
    ],
)
def test_upload_content_image_accepts_allowed_format(
    tmp_path, filename, content_type, content_factory,
):
    _override_storage_to_tmp(tmp_path)
    try:
        response = client.post(
            "/api/admin/files/articles/content-images",
            files={"file": (filename, content_factory(), content_type)},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "200"
        assert body["data"]["file_url"].endswith(filename.rsplit(".", 1)[-1])
        stored_name = body["data"]["file_url"].rsplit("/", 1)[-1]
        assert (tmp_path / "articles" / "content" / stored_name).exists()
    finally:
        _clear_overrides()


# 测试上传空文件失败, 并返回错误信息
def test_upload_rejects_empty_file():
    # 上传空文件，调用post接口，返回响应
    response = client.post(
        "/api/admin/files/articles/content-images",
        files={"file": ("test.png", b"", "image/png")},
    )
    # 断言响应状态码为 400，即失败
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "400"
    assert body["message"] == "文件为空"
    assert body["data"] is None

# 测试上传非图片文件失败, 并返回错误信息
def test_upload_rejects_wrong_extension():
    content = _make_png_bytes()
    response = client.post(
        "/api/admin/files/articles/content-images",
        files={"file": ("test.txt", content, "text/plain")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "400"
    assert body["message"] == "文件类型不允许"
    assert body["data"] is None

# 测试上传非图片文件失败, 并返回错误信息
def test_upload_rejects_fake_image():
    response = client.post(
        "/api/admin/files/articles/content-images",
        files={"file": ("test.png", b"not an image", "image/png")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "400"
    assert body["message"] == "文件真实内容不是允许的图片"
    assert body["data"] is None

# 测试上传空文件失败, 并返回错误信息
def test_upload_without_file_returns_400():
    response = client.post("/api/admin/files/articles/content-images")
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "400"
    assert body["message"] == "参数错误"
    assert body["data"] is None

# 测试上传内容图片失败, 并返回错误信息
def test_upload_storage_failure_returns_500():
    _override_storage_to_fail()
    try:
        content = _make_png_bytes()
        response = client.post(
            "/api/admin/files/articles/content-images",
            files={"file": ("test.png", content, "image/png")},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "500"
        assert body["message"] == "系统异常"
        assert body["data"] is None
    finally:
        _clear_overrides()

# 测试上传不存在的路由失败, 并返回错误信息
def test_nonexistent_route_returns_404():
    response = client.post("/api/admin/files/articles/nonexistent")
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "404"
    assert body["message"] == "数据不存在"
    assert body["data"] is None


# 辅助函数，把存储依赖覆盖为抛出非应用异常的存储后端。
# 抛出普通 Exception 而非 SystemException，验证兜底处理器是否接住。
def _override_storage_to_raise_unhandled() -> None:
    class CrashStorage(StorageBackend):
        async def save(self, data: bytes, filename: str) -> str:
            raise RuntimeError("测试模拟未知异常")

        async def delete(self, file_url: str) -> bool:
            return False

    def _override() -> StorageBackend:
        return CrashStorage()

    app.dependency_overrides[get_storage_backend] = _override


# 测试未知异常被兜底处理器接住，返回 code="500" 和 "系统异常"
def test_upload_unhandled_exception_returns_500():
    _override_storage_to_raise_unhandled()
    try:
        content = _make_png_bytes()
        response = client.post(
            "/api/admin/files/articles/content-images",
            files={"file": ("test.png", content, "image/png")},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == "500"
        assert body["message"] == "系统异常"
        assert body["data"] is None
    finally:
        _clear_overrides()


def test_cleanup_content_image_retains_file_referenced_by_any_article(tmp_path):
    storage = _override_storage_to_tmp(tmp_path)
    _override_session()
    file_name = f"referenced-{uuid4().hex}.png"
    file_url = asyncio.run(storage.save(b"content image", file_name))
    article_id = asyncio.run(_insert_article(f"![image]({file_url})"))
    try:
        response = client.request(
            "DELETE",
            "/api/admin/files/articles/content-images",
            json={"file_url": file_url},
        )

        assert response.status_code == 200
        assert response.json() == {
            "code": "200",
            "message": "请求成功",
            "data": {"result": "retained_in_use"},
        }
        assert (tmp_path / "articles" / "content" / file_name).exists()
    finally:
        _clear_overrides()
        asyncio.run(_delete_article(article_id))


def test_cleanup_content_image_deletes_unreferenced_file_and_is_idempotent(tmp_path):
    storage = _override_storage_to_tmp(tmp_path)
    _override_session()
    file_name = f"unreferenced-{uuid4().hex}.png"
    file_url = asyncio.run(storage.save(b"content image", file_name))
    try:
        response = client.request(
            "DELETE",
            "/api/admin/files/articles/content-images",
            json={"file_url": file_url},
        )
        retry_response = client.request(
            "DELETE",
            "/api/admin/files/articles/content-images",
            json={"file_url": file_url},
        )

        assert response.status_code == 200
        assert response.json()["data"] == {"result": "deleted"}
        assert retry_response.status_code == 200
        assert retry_response.json()["data"] == {"result": "already_absent"}
        assert not (tmp_path / "articles" / "content" / file_name).exists()
    finally:
        _clear_overrides()


def test_cleanup_content_image_ignores_external_url(tmp_path):
    _override_storage_to_tmp(tmp_path)
    _override_session()
    try:
        response = client.request(
            "DELETE",
            "/api/admin/files/articles/content-images",
            json={"file_url": "https://example.com/image.png"},
        )

        assert response.status_code == 200
        assert response.json()["data"] == {"result": "external_ignored"}
    finally:
        _clear_overrides()


def test_cleanup_content_image_rejects_empty_file_url(tmp_path):
    _override_storage_to_tmp(tmp_path)
    _override_session()
    try:
        response = client.request(
            "DELETE",
            "/api/admin/files/articles/content-images",
            json={"file_url": ""},
        )

        assert response.status_code == 200
        assert response.json() == {
            "code": "400",
            "message": "参数错误",
            "data": None,
        }
    finally:
        _clear_overrides()
