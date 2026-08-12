import asyncio
import io
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from PIL import Image
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import BusinessException, DatabaseException
from app.modules.file.image import service as file_service
from app.modules.file.image.dependencies import get_article_cover_image_service
from app.modules.file.image.schemas import ImageUploadData
from app.modules.file.image.service import (
    ImageService,
    MAX_CONTENT_IMAGE_SIZE,
    generate_filename,
    prepare_image,
    validate_content_image,
)
from app.modules.file.storage.local_disk import LocalStorage

def _make_png_bytes() -> bytes:
    # 测试辅助函数：用 Pillow 在内存中生成一张最小合法 PNG 的二进制内容。
    # 不读磁盘文件，保证测试自包含——不依赖 storage/ 下任何外部资源。
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="PNG")
    return buf.getvalue()


def _make_jpeg_bytes() -> bytes:
    # 同上，生成合法 JPEG 内容，用于测试不同图片类型。
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="JPEG")
    return buf.getvalue()


def _make_webp_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="WEBP")
    return buf.getvalue()


def _make_gif_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (1, 1)).save(buf, format="GIF")
    return buf.getvalue()


def _upload(filename: str, content_type: str, content: bytes) -> ImageUploadData:
    return ImageUploadData(filename=filename, content_type=content_type, content=content)


# 辅助函数名以 _ 开头，pytest 不会把它当测试函数收集。
# 这是 pytest 的约定：只有 test_ 开头的函数才会被执行。


# ===== validate_content_image 成功路径 =====


def test_validate_content_image_accepts_valid_png():
    # 成功路径：合法 PNG 通过校验。
    # validate_content_image 返回 None，函数不抛异常即视为通过——不需要 assert。
    content = _make_png_bytes()
    validate_content_image("test.png", "image/png", content)


def test_validate_content_image_accepts_valid_jpeg():
    # 成功路径：合法 JPEG 通过校验。
    content = _make_jpeg_bytes()
    validate_content_image("test.jpg", "image/jpeg", content)


def test_validate_content_image_accepts_valid_webp():
    validate_content_image("test.webp", "image/webp", _make_webp_bytes())


def test_validate_content_image_accepts_gif_when_allowed():
    validate_content_image("test.gif", "image/gif", _make_gif_bytes(), allow_gif=True)


def test_validate_content_image_rejects_gif_when_not_allowed():
    with pytest.raises(BusinessException, match="文件类型不允许"):
        validate_content_image("test.gif", "image/gif", _make_gif_bytes())


# ===== validate_content_image 失败路径 =====


def test_validate_content_image_rejects_empty_file():
    # 边界：空文件抛 BusinessException，message 含"文件为空"。
    with pytest.raises(BusinessException, match="文件为空"):
        validate_content_image("test.png", "image/png", b"")


def test_validate_content_image_rejects_oversized_file():
    # 边界：超过 MAX_CONTENT_IMAGE_SIZE 抛异常。
    # 构造超大 bytes，内容不需要是真实图片——大小检查在图片内容校验之前。
    oversized = b"x" * (MAX_CONTENT_IMAGE_SIZE + 1)
    with pytest.raises(BusinessException, match="文件大小超过限制"):
        validate_content_image("test.png", "image/png", oversized)


def test_validate_content_image_rejects_wrong_extension():
    # 扩展名不在允许列表内（如 .txt），抛异常。
    content = _make_png_bytes()
    with pytest.raises(BusinessException, match="文件类型不允许"):
        validate_content_image("test.txt", "text/plain", content)


def test_validate_content_image_rejects_mime_mismatch():
    # 扩展名与 MIME 不匹配（.png 但声明 image/jpeg），抛异常。
    # 防止单独改扩展名或单独改 Content-Type 伪造。
    content = _make_png_bytes()
    with pytest.raises(BusinessException, match="文件类型不允许"):
        validate_content_image("test.png", "image/jpeg", content)


def test_validate_content_image_rejects_fake_image():
    # 内容不是真实图片（纯文本字节），Pillow verify 失败，抛异常。
    # 这是"只信内容不信标签"的核心校验。
    fake_content = b"this is not an image"
    with pytest.raises(BusinessException, match="文件真实内容不是允许的图片"):
        validate_content_image("test.png", "image/png", fake_content)


# ===== generate_filename =====


def test_generate_filename_preserves_extension():
    # 生成的文件名保留原扩展名，且转为小写。
    # StaticFiles 靠扩展名判断 Content-Type，扩展名必须保留。
    filename = generate_filename("MyPhoto.PNG")
    # 测试 assert 语句：检查生成的文件名是否以 .png 结尾。
    # 这是测试文件名是否符合预期，而不是测试函数是否抛异常。
    assert filename.endswith(".png")


def test_generate_filename_is_unique():
    # 连续生成多次，文件名不重复（时间戳 + uuid 随机部分保证唯一）。
    # 用集合去重：如果生成了重复名，集合大小会小于 100。
    names = {generate_filename("test.png") for _ in range(100)}
    assert len(names) == 100


def test_generate_filename_has_no_original_name():
    # 服务端命名不含原始文件名，避免泄露用户信息或路径穿越。
    filename = generate_filename("user_secret_photo.png")
    assert "user_secret_photo" not in filename


# ===== prepare_image：校验 + 命名，不碰存储/DB =====


def test_prepare_image_returns_content_and_stored_name():
    content = _make_png_bytes()
    prepared = prepare_image(_upload("cover.PNG", "image/png", content))

    assert prepared.content is content
    assert prepared.stored_name.endswith(".png")
    assert "cover" not in prepared.stored_name


def test_prepare_image_rejects_invalid_image():
    with pytest.raises(BusinessException, match="文件为空"):
        prepare_image(_upload("empty.png", "image/png", b""))


def test_image_service_dependency_keeps_request_scoped_tools():
    session = AsyncMock()
    storage = AsyncMock()

    image_service = get_article_cover_image_service(session=session, storage=storage)

    assert isinstance(image_service, ImageService)
    assert image_service.session is session
    assert image_service.storage is storage


def test_image_service_updates_cover_from_module_input_model(monkeypatch):
    article = SimpleNamespace(id=9, cover_url=None)
    session = AsyncMock()
    storage = AsyncMock()
    storage.save.return_value = "/files/articles/cover/new.png"
    monkeypatch.setattr(file_service, "get_article", AsyncMock(return_value=article))
    image_service = ImageService(session=session, storage=storage)
    upload = ImageUploadData(
        filename="cover.png",
        content_type="image/png",
        content=_make_png_bytes(),
    )

    result = asyncio.run(image_service.update_article_cover(9, upload))

    assert result == "/files/articles/cover/new.png"
    session.commit.assert_awaited_once()


# ===== replace_entity_url：存新 -> 写库 -> 失败补偿 / 删旧 =====


def test_replace_entity_url_saves_commits_and_deletes_old():
    entity = SimpleNamespace(cover_url="/files/old.png")
    image = prepare_image(_upload("new.png", "image/png", _make_png_bytes()))
    storage = AsyncMock()
    storage.save.return_value = "/files/new.png"
    session = AsyncMock()
    image_service = ImageService(session=session, storage=storage)

    new_url = asyncio.run(
        image_service._replace_entity_url(entity, "cover_url", image)
    )

    assert new_url == "/files/new.png"
    assert entity.cover_url == "/files/new.png"
    storage.save.assert_awaited_once_with(image.content, image.stored_name)
    session.commit.assert_awaited_once()
    storage.delete.assert_awaited_once_with("/files/old.png")
    session.rollback.assert_not_awaited()


def test_replace_entity_url_skips_delete_when_no_old_url():
    entity = SimpleNamespace(avatar=None)
    image = prepare_image(_upload("avatar.png", "image/png", _make_png_bytes()))
    storage = AsyncMock()
    storage.save.return_value = "/files/avatar.png"
    session = AsyncMock()
    image_service = ImageService(session=session, storage=storage)

    asyncio.run(
        image_service._replace_entity_url(entity, "avatar", image)
    )

    storage.delete.assert_not_awaited()


def test_replace_entity_url_rolls_back_and_deletes_new_on_db_error():
    entity = SimpleNamespace(cover_url="/files/old.png")
    image = prepare_image(_upload("new.png", "image/png", _make_png_bytes()))
    storage = AsyncMock()
    storage.save.return_value = "/files/new.png"
    session = AsyncMock()
    session.commit.side_effect = SQLAlchemyError("db down")
    image_service = ImageService(session=session, storage=storage)

    with pytest.raises(DatabaseException):
        asyncio.run(
            image_service._replace_entity_url(entity, "cover_url", image)
        )

    session.rollback.assert_awaited_once()
    storage.delete.assert_awaited_once_with("/files/new.png")


def test_replace_entity_url_preserves_db_error_when_compensation_delete_fails():
    entity = SimpleNamespace(cover_url="/files/old.png")
    image = prepare_image(_upload("new.png", "image/png", _make_png_bytes()))
    storage = AsyncMock()
    storage.save.return_value = "/files/new.png"
    storage.delete.side_effect = OSError("disk busy")
    session = AsyncMock()
    session.commit.side_effect = SQLAlchemyError("db down")
    image_service = ImageService(session=session, storage=storage)

    with pytest.raises(DatabaseException) as exc_info:
        asyncio.run(
            image_service._replace_entity_url(entity, "cover_url", image)
        )

    assert isinstance(exc_info.value.__cause__, SQLAlchemyError)
    session.rollback.assert_awaited_once()
    storage.delete.assert_awaited_once_with("/files/new.png")


def test_replace_entity_url_keeps_new_url_when_old_delete_fails():
    entity = SimpleNamespace(cover_url="/files/old.png")
    image = prepare_image(_upload("new.png", "image/png", _make_png_bytes()))
    storage = AsyncMock()
    storage.save.return_value = "/files/new.png"
    storage.delete.side_effect = OSError("disk busy")
    session = AsyncMock()
    image_service = ImageService(session=session, storage=storage)

    new_url = asyncio.run(
        image_service._replace_entity_url(entity, "cover_url", image)
    )

    assert new_url == "/files/new.png"
    assert entity.cover_url == "/files/new.png"
    session.commit.assert_awaited_once()
    session.rollback.assert_not_awaited()


# ===== remove bound image：清空地址 -> 提交 -> 清理旧文件 =====


def test_remove_entity_url_clears_local_url_after_commit():
    old_url = "/files/admins/avatar/old.png"
    entity = SimpleNamespace(avatar=old_url)
    storage = AsyncMock()
    session = AsyncMock()
    image_service = ImageService(session=session, storage=storage)

    asyncio.run(
        image_service._clear_entity_url(entity, "avatar", "admin_avatar", 7)
    )

    assert entity.avatar is None
    session.commit.assert_awaited_once()
    session.rollback.assert_not_awaited()
    storage.delete.assert_awaited_once_with(old_url)


def test_remove_entity_url_skips_empty_url():
    entity = SimpleNamespace(avatar=None)
    storage = AsyncMock()
    session = AsyncMock()
    image_service = ImageService(session=session, storage=storage)

    asyncio.run(
        image_service._clear_entity_url(entity, "avatar", "admin_avatar", 7)
    )

    session.commit.assert_not_awaited()
    storage.delete.assert_not_awaited()


def test_remove_entity_url_rolls_back_and_keeps_old_url_on_db_error():
    old_url = "/files/articles/cover/old.png"
    entity = SimpleNamespace(cover_url=old_url)
    storage = AsyncMock()
    session = AsyncMock()
    session.commit.side_effect = SQLAlchemyError("db down")
    image_service = ImageService(session=session, storage=storage)

    with pytest.raises(DatabaseException):
        asyncio.run(
            image_service._clear_entity_url(entity, "cover_url", "article_cover", 9)
        )

    assert entity.cover_url == old_url
    session.rollback.assert_awaited_once()
    storage.delete.assert_not_awaited()


def test_remove_entity_url_keeps_empty_url_when_file_delete_fails():
    entity = SimpleNamespace(background_url="/files/site/background/old.png")
    storage = AsyncMock()
    storage.delete.side_effect = OSError("disk busy")
    session = AsyncMock()
    image_service = ImageService(session=session, storage=storage)

    asyncio.run(
        image_service._clear_entity_url(entity, "background_url", "site_background", 3)
    )

    assert entity.background_url is None
    session.commit.assert_awaited_once()
    session.rollback.assert_not_awaited()
    storage.delete.assert_awaited_once()


def test_remove_entity_url_keeps_unmanaged_file(tmp_path):
    managed_dir = tmp_path / "admins" / "avatar"
    managed_file = managed_dir / "old.png"
    managed_file.parent.mkdir(parents=True)
    managed_file.write_bytes(b"managed file")
    storage = LocalStorage(
        base_dir=str(managed_dir),
        base_url="/files/admins/avatar",
    )
    entity = SimpleNamespace(avatar="https://example.com/avatar.png")
    session = AsyncMock()
    image_service = ImageService(session=session, storage=storage)

    asyncio.run(
        image_service._clear_entity_url(entity, "avatar", "admin_avatar", 7)
    )

    assert entity.avatar is None
    assert managed_file.exists()
    session.commit.assert_awaited_once()


@pytest.mark.parametrize(
    ("remove_name", "getter_name", "entity", "args", "url_attr"),
    [
        pytest.param(
            "remove_admin_avatar",
            "get_admin",
            SimpleNamespace(id=7, avatar="/files/admins/avatar/old.png"),
            (7,),
            "avatar",
            id="avatar",
        ),
        pytest.param(
            "remove_article_cover",
            "get_article",
            SimpleNamespace(id=9, cover_url="/files/articles/cover/old.png"),
            (9,),
            "cover_url",
            id="cover",
        ),
        pytest.param(
            "remove_site_background",
            "get_site_config",
            SimpleNamespace(id=3, background_url="/files/site/background/old.png"),
            (),
            "background_url",
            id="background",
        ),
    ],
)
def test_remove_bound_image_clears_matching_entity(
    monkeypatch,
    remove_name,
    getter_name,
    entity,
    args,
    url_attr,
):
    storage = AsyncMock()
    session = AsyncMock()
    old_url = getattr(entity, url_attr)
    monkeypatch.setattr(file_service, getter_name, AsyncMock(return_value=entity))

    remove = getattr(ImageService(session=session, storage=storage), remove_name)
    asyncio.run(remove(*args))

    assert getattr(entity, url_attr) is None
    session.commit.assert_awaited_once()
    storage.delete.assert_awaited_once_with(old_url)


@pytest.mark.parametrize(
    ("remove_name", "getter_name", "args", "message"),
    [
        pytest.param(
            "remove_admin_avatar",
            "get_admin",
            (7,),
            "管理员不存在",
            id="avatar",
        ),
        pytest.param(
            "remove_article_cover",
            "get_article",
            (9,),
            "文章不存在",
            id="cover",
        ),
        pytest.param(
            "remove_site_background",
            "get_site_config",
            (),
            "站点配置不存在",
            id="background",
        ),
    ],
)
def test_remove_bound_image_rejects_missing_entity(
    monkeypatch,
    remove_name,
    getter_name,
    args,
    message,
):
    storage = AsyncMock()
    session = AsyncMock()
    monkeypatch.setattr(file_service, getter_name, AsyncMock(return_value=None))

    remove = getattr(ImageService(session=session, storage=storage), remove_name)
    with pytest.raises(BusinessException, match=message):
        asyncio.run(remove(*args))

    session.commit.assert_not_awaited()
    storage.delete.assert_not_awaited()
