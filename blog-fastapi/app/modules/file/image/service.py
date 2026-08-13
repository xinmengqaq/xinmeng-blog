import io
import uuid
from dataclasses import dataclass
from datetime import datetime

from PIL import Image
from loguru import logger
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessException, DatabaseException
from app.core.response_codes import ResponseCode
from app.modules.auth.models import Admin
from app.modules.user.models import BlogUser
from app.modules.file.image.enums import ContentImageCleanupResult
from app.modules.file.image.models import Article, SiteConfig
from app.modules.file.image.schemas import ImageUploadData
from app.modules.file.storage.base import StorageBackend


# 允许上传的文件扩展名
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
# 允许上传的文件 MIME 类型
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
EXT_TO_MIME = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",
}

# 最大上传文件大小
MAX_CONTENT_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
# 普通用户头像只有一张图，限制更小
MAX_USER_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB


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
    max_size: int = MAX_CONTENT_IMAGE_SIZE,
) -> None:
    #是否是空文件
    if not content:
        raise BusinessException(message="文件为空")

    #是否文件超过限定大小
    if len(content) > max_size :
        raise BusinessException(message="文件大小超过限制")


    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    #是否符合文件类型
    if ext not in ALLOWED_EXTENSIONS:
        raise BusinessException(message="文件类型不允许")

    if content_type not in ALLOWED_MIME_TYPES:
        raise BusinessException(message="文件类型不允许")

    # 扩展名与 MIME 必须对应，防止单独改扩展名或单独改 Content-Type 伪造
    if EXT_TO_MIME.get(ext) != content_type:
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
    upload: ImageUploadData,
    *,
    allow_gif: bool = False,
    max_size: int = MAX_CONTENT_IMAGE_SIZE,
) -> PreparedImage:
    # 纯准备：校验 + 命名。无存储、无 DB，失败只抛业务异常
    validate_content_image(
        upload.filename,
        upload.content_type,
        upload.content,
        allow_gif=allow_gif,
        max_size=max_size,
    )
    return PreparedImage(
        content=upload.content,
        stored_name=generate_filename(upload.filename),
    )


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


async def get_user(user_id: int, session: AsyncSession) -> BlogUser | None:
    stmt = select(BlogUser).where(BlogUser.id == user_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_site_config(session: AsyncSession) -> SiteConfig | None:
    # 站点配置按单行约定：取主键最小的一条；无行则 None -> 业务 404
    stmt = select(SiteConfig).order_by(SiteConfig.id.asc()).limit(1)
    return (await session.execute(stmt)).scalar_one_or_none()


class ImageService:
    def __init__(self, session: AsyncSession, storage: StorageBackend) -> None:
        self.session = session
        self.storage = storage

    async def cleanup_content_image(self, file_url: str) -> ContentImageCleanupResult:
        if not self.storage.owns(file_url):
            return ContentImageCleanupResult.EXTERNAL_IGNORED

        stmt = select(Article.id).where(Article.content.contains(file_url)).limit(1)
        try:
            referenced_article = (await self.session.execute(stmt)).scalar_one_or_none()
        except SQLAlchemyError as e:
            raise DatabaseException() from e

        if referenced_article is not None:
            return ContentImageCleanupResult.RETAINED_IN_USE

        return (
            ContentImageCleanupResult.DELETED
            if await self.storage.delete(file_url)
            else ContentImageCleanupResult.ALREADY_ABSENT
        )

    async def _replace_entity_url(
        self,
        entity: object,
        url_attr: str,
        image: PreparedImage,
    ) -> str:
        # 已加载实体上的 URL 字段替换：存新 -> commit -> 失败删新 / 成功删旧
        # 不负责查实体、不负责 404；调用方保证 entity 存在
        old_url = getattr(entity, url_attr)
        new_url = await self.storage.save(image.content, image.stored_name)
        try:
            setattr(entity, url_attr, new_url)
            await self.session.commit()
        except SQLAlchemyError as e:
            await self.session.rollback()
            try:
                await self.storage.delete(new_url)
            except OSError as cleanup_error:
                logger.warning(
                    "数据库提交失败后的新文件补偿清理失败: 异常类型={}",
                    type(cleanup_error).__name__,
                )
            raise DatabaseException() from e

        if old_url:
            try:
                await self.storage.delete(old_url)
            except OSError as e:
                logger.warning("删除旧文件失败: 异常类型={}", type(e).__name__)
        return new_url

    async def _clear_entity_url(
        self,
        entity: object,
        url_attr: str,
        scene: str,
        business_id: int,
    ) -> None:
        old_url = getattr(entity, url_attr)
        if not old_url:
            return

        setattr(entity, url_attr, None)
        try:
            await self.session.commit()
        except SQLAlchemyError as e:
            await self.session.rollback()
            setattr(entity, url_attr, old_url)
            raise DatabaseException() from e

        try:
            await self.storage.delete(old_url)
        except OSError:
            logger.warning(
                "清理绑定图片失败: scene={}, business_id={}, result=database_cleared",
                scene,
                business_id,
            )

    async def update_article_cover(self, article_id: int, upload: ImageUploadData) -> str:
        image = prepare_image(upload)
        article = await get_article(article_id, self.session)
        if article is None:
            raise BusinessException(message="文章不存在", code=ResponseCode.NOT_FOUND)
        return await self._replace_entity_url(article, "cover_url", image)

    async def remove_article_cover(self, article_id: int) -> None:
        article = await get_article(article_id, self.session)
        if article is None:
            raise BusinessException(message="文章不存在", code=ResponseCode.NOT_FOUND)
        await self._clear_entity_url(article, "cover_url", "article_cover", article_id)

    async def update_admin_avatar(self, admin_id: int, upload: ImageUploadData) -> str:
        image = prepare_image(upload)
        admin = await get_admin(admin_id, self.session)
        if admin is None:
            raise BusinessException(message="管理员不存在", code=ResponseCode.NOT_FOUND)
        return await self._replace_entity_url(admin, "avatar", image)

    async def remove_admin_avatar(self, admin_id: int) -> None:
        admin = await get_admin(admin_id, self.session)
        if admin is None:
            raise BusinessException(message="管理员不存在", code=ResponseCode.NOT_FOUND)
        await self._clear_entity_url(admin, "avatar", "admin_avatar", admin_id)

    async def update_user_avatar(self, user_id: int, upload: ImageUploadData) -> str:
        image = prepare_image(upload, max_size=MAX_USER_AVATAR_SIZE)
        user = await get_user(user_id, self.session)
        if user is None:
            raise BusinessException(message="用户不存在", code=ResponseCode.NOT_FOUND)
        if user.status != "enabled":
            raise BusinessException(message="用户不可用", code=ResponseCode.FORBIDDEN)
        return await self._replace_entity_url(user, "avatar", image)

    async def remove_user_avatar(self, user_id: int) -> None:
        user = await get_user(user_id, self.session)
        if user is None:
            raise BusinessException(message="用户不存在", code=ResponseCode.NOT_FOUND)
        if user.status != "enabled":
            raise BusinessException(message="用户不可用", code=ResponseCode.FORBIDDEN)
        await self._clear_entity_url(user, "avatar", "user_avatar", user_id)

    async def update_site_background(self, upload: ImageUploadData) -> str:
        image = prepare_image(upload)
        site_config = await get_site_config(self.session)
        if site_config is None:
            raise BusinessException(message="站点配置不存在", code=ResponseCode.NOT_FOUND)
        return await self._replace_entity_url(site_config, "background_url", image)

    async def remove_site_background(self) -> None:
        site_config = await get_site_config(self.session)
        if site_config is None:
            raise BusinessException(message="站点配置不存在", code=ResponseCode.NOT_FOUND)
        await self._clear_entity_url(
            site_config,
            "background_url",
            "site_background",
            site_config.id,
        )
