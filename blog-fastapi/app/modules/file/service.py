import io
import uuid
from dataclasses import dataclass
from datetime import datetime

import filetype
from PIL import Image
from loguru import logger
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessException, DatabaseException
from app.core.response_codes import ResponseCode
from app.modules.auth.models import Admin
from app.modules.file.enums import ContentImageCleanupResult
from app.modules.file.models import Article, SiteConfig
from app.modules.file.storage.base import StorageBackend


# 允许上传的文件扩展名
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
# 允许上传的文件 MIME 类型
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

# 最大上传文件大小
MAX_CONTENT_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


"""
验证内容图片是否符合要求
filename: 文件名
content_type: 文件 MIME 类型
content: 文件内容
"""
def validate_content_image(
    filename: str,
    content_type: str,
    content: bytes,
    *,
    allow_gif: bool = False,
) -> None:
    #是否是空文件
    if not content:
        raise BusinessException(message="文件为空")

    #是否文件超过限定大小
    if len(content) > MAX_CONTENT_IMAGE_SIZE :
        raise BusinessException(message="文件大小超过限制")


    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    #是否符合文件类型
    if ext not in ALLOWED_EXTENSIONS:
        raise BusinessException(message="文件类型不允许")

    if content_type not in ALLOWED_MIME_TYPES:
        raise BusinessException(message="文件类型不允许")

    kind = filetype.guess(content)
    if kind is None:
        raise BusinessException(message="文件真实内容不是允许的图片")

    # filetype 的 JPEG 扩展名统一为 jpg，需兼容客户端常见的 .jpeg 后缀。
    normalized_ext = "jpg" if ext == "jpeg" else ext
    if normalized_ext != kind.extension or content_type != kind.mime:
        raise BusinessException(message="文件类型不允许")

    if ext == "gif" and not allow_gif:
        raise BusinessException(message="文件类型不允许")


    # 真实内容校验：读二进制头并验证完整性，只信内容不信标签
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
    except Exception as e:
        raise BusinessException(message="文件真实内容不是允许的图片") from e

#拼接随机字符串
def generate_filename(filename: str) -> str:
    # 服务端生成唯一名，不用原始文件名（原始名可能重名、含恶意字符、泄露用户信息）
    # 保留扩展名：静态访问靠扩展名判断 Content-Type，且扩展名已通过校验可信
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "png"
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_part = uuid.uuid4().hex[:8]
    return f"{timestamp}-{random_part}.{ext}"


@dataclass(frozen=True, slots=True)
class PreparedImage:
    # 校验通过后的上传内容 + 服务端生成的存储文件名；不包含 URL，URL 由 storage.save 产生
    content: bytes
    stored_name: str


def prepare_image(
    filename: str,
    content_type: str,
    content: bytes,
    *,
    allow_gif: bool = False,
) -> PreparedImage:
    # 纯准备：校验 + 命名。无存储、无 DB，失败只抛业务异常
    validate_content_image(filename, content_type, content, allow_gif=allow_gif)
    return PreparedImage(content=content, stored_name=generate_filename(filename))


#async是异步函数，检查数据库操作是否成功
async def get_article(article_id: int, session: AsyncSession) -> Article | None:
    # select(模型).where(条件) 构造查询语句，还不发 SQL
    # await session.execute(stmt) 才真正发 SQL，返回 Result 对象，它需要等待数据库返回结果
    # scalar_one_or_none() 取 0 或 1 条：0 条返回 None，超过 1 条抛异常
    stmt = select(Article).where(Article.id == article_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async  def get_admin(admin_id: int, session: AsyncSession) -> Admin | None:

    stmt = select(Admin).where(Admin.id == admin_id)
    return (await  session.execute(stmt)).scalar_one_or_none()


async def get_site_config(session: AsyncSession) -> SiteConfig | None:
    # 站点配置按单行约定：取主键最小的一条；无行则 None -> 业务 404
    stmt = select(SiteConfig).order_by(SiteConfig.id.asc()).limit(1)
    return (await session.execute(stmt)).scalar_one_or_none()


async def replace_entity_url(
    *,
    entity: object,
    url_attr: str,
    image: PreparedImage,
    storage: StorageBackend,
    session: AsyncSession,
) -> str:
    # 已加载实体上的 URL 字段替换：存新 -> commit -> 失败删新 / 成功删旧
    # 不负责查实体、不负责 404；调用方保证 entity 存在
    old_url = getattr(entity, url_attr)
    new_url = await storage.save(image.content, image.stored_name)
    try:
        setattr(entity, url_attr, new_url)
        await session.commit()
    except SQLAlchemyError as e:
        await session.rollback()
        try:
            await storage.delete(new_url)
        except OSError as cleanup_error:
            logger.opt(exception=cleanup_error).warning("数据库提交失败后的新文件补偿清理失败")
        raise DatabaseException() from e

    if old_url:
        try:
            await storage.delete(old_url)
        except OSError as e:
            logger.opt(exception=e).warning("删除旧文件失败: {}", old_url)

    return new_url


async def clear_entity_url(
    *,
    entity: object,
    url_attr: str,
    storage: StorageBackend,
    session: AsyncSession,
    scene: str,
    business_id: int,
) -> None:
    old_url = getattr(entity, url_attr)
    if not old_url:
        return

    setattr(entity, url_attr, None)
    try:
        await session.commit()
    except SQLAlchemyError as e:
        await session.rollback()
        setattr(entity, url_attr, old_url)
        raise DatabaseException() from e

    try:
        await storage.delete(old_url)
    except OSError:
        logger.warning(
            "清理绑定图片失败: scene={}, business_id={}, result=database_cleared",
            scene,
            business_id,
        )


async def cleanup_content_image(
    file_url: str,
    storage: StorageBackend,
    session: AsyncSession,
) -> ContentImageCleanupResult:
    if not storage.owns(file_url):
        return ContentImageCleanupResult.EXTERNAL_IGNORED

    stmt = select(Article.id).where(Article.content.contains(file_url)).limit(1)
    try:
        referenced_article = (await session.execute(stmt)).scalar_one_or_none()
    except SQLAlchemyError as e:
        raise DatabaseException() from e

    if referenced_article is not None:
        return ContentImageCleanupResult.RETAINED_IN_USE

    return (
        ContentImageCleanupResult.DELETED
        if await storage.delete(file_url)
        else ContentImageCleanupResult.ALREADY_ABSENT
    )


async def remove_article_cover(
    article_id: int,
    storage: StorageBackend,
    session: AsyncSession,
) -> None:
    article = await get_article(article_id, session)
    if article is None:
        raise BusinessException(message="文章不存在", code=ResponseCode.NOT_FOUND)

    await clear_entity_url(
        entity=article,
        url_attr="cover_url",
        storage=storage,
        session=session,
        scene="article_cover",
        business_id=article_id,
    )


async def remove_admin_avatar(
    admin_id: int,
    storage: StorageBackend,
    session: AsyncSession,
) -> None:
    admin = await get_admin(admin_id, session)
    if admin is None:
        raise BusinessException(message="管理员不存在", code=ResponseCode.NOT_FOUND)

    await clear_entity_url(
        entity=admin,
        url_attr="avatar",
        storage=storage,
        session=session,
        scene="admin_avatar",
        business_id=admin_id,
    )


async def remove_site_background(
    storage: StorageBackend,
    session: AsyncSession,
) -> None:
    site_config = await get_site_config(session)
    if site_config is None:
        raise BusinessException(message="站点配置不存在", code=ResponseCode.NOT_FOUND)

    await clear_entity_url(
        entity=site_config,
        url_attr="background_url",
        storage=storage,
        session=session,
        scene="site_background",
        business_id=site_config.id,
    )


async def update_article_cover(
    article_id: int,
    filename: str,
    content_type: str,
    content: bytes,
    storage: StorageBackend,
    session: AsyncSession,
) -> str:
    image = prepare_image(filename, content_type, content)

    article = await get_article(article_id, session)
    if article is None:
        raise BusinessException(message="文章不存在", code=ResponseCode.NOT_FOUND)

    return await replace_entity_url(
        entity=article,
        url_attr="cover_url",
        image=image,
        storage=storage,
        session=session,
    )


async def update_admin_avatar(
    admin_id: int,
    filename: str,
    content_type: str,
    content: bytes,
    storage: StorageBackend,
    session: AsyncSession,
) -> str:
    image = prepare_image(filename, content_type, content)

    admin = await get_admin(admin_id, session)
    if admin is None:
        raise BusinessException(message="管理员不存在", code=ResponseCode.NOT_FOUND)

    return await replace_entity_url(
        entity=admin,
        url_attr="avatar",
        image=image,
        storage=storage,
        session=session,
    )


async def update_site_background(
    filename: str,
    content_type: str,
    content: bytes,
    storage: StorageBackend,
    session: AsyncSession,
) -> str:
    image = prepare_image(filename, content_type, content)

    site_config = await get_site_config(session)
    if site_config is None:
        raise BusinessException(message="站点配置不存在", code=ResponseCode.NOT_FOUND)

    return await replace_entity_url(
        entity=site_config,
        url_attr="background_url",
        image=image,
        storage=storage,
        session=session,
    )
