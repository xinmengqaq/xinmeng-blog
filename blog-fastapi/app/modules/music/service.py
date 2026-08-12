from math import ceil

from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessException, DatabaseException, ResponseCode
from app.modules.file.audio.schemas import AudioSaveResult
from app.modules.file.audio.service import delete_audio, save_audio
from app.modules.file.storage.base import StorageBackend
from app.modules.music.models import Music
from app.modules.music.schemas import CreateMusicData, MusicPage, MusicQuery, MusicUpdate


async def _compensate_cleanup(storage: StorageBackend, audio_url: str) -> None:
    # 数据库事务失败时同步删除本次新文件，避免孤儿文件；
    # 删除失败只记安全 WARNING，不覆盖原数据库异常
    try:
        await storage.delete(audio_url)
    except OSError as cleanup_error:
        logger.opt(exception=cleanup_error).warning("创建音乐数据库失败后的文件补偿清理失败")


class MusicService:
    def __init__(self, session: AsyncSession, storage: StorageBackend) -> None:
        self.session = session
        self.storage = storage

    async def create(self, data: CreateMusicData, upload) -> Music:
        # 文件子系统校验 MP3、限制大小、解析时长并保存文件
        result: AudioSaveResult = await save_audio(upload, self.storage)

        music = Music(
            title=data.title,
            artist=data.artist,
            audio_url=result.audio_url,
            duration_ms=result.duration_ms,
            is_enabled=True,
        )
        self.session.add(music)
        try:
            await self.session.commit()
        except SQLAlchemyError as e:
            await self.session.rollback()
            await _compensate_cleanup(self.storage, result.audio_url)
            raise DatabaseException() from e

        return music

    async def _fetch(self, music_id: int) -> Music:
        # 查询单条记录，不存在抛 404；查询失败统一转换为 DatabaseException。
        try:
            result = await self.session.execute(select(Music).where(Music.id == music_id))
        except SQLAlchemyError as e:
            raise DatabaseException() from e
        music = result.scalar_one_or_none()
        if music is None:
            raise BusinessException(message="音乐不存在", code=ResponseCode.NOT_FOUND)
        return music

    async def list_music(self, query: MusicQuery, *, include_disabled: bool = False) -> MusicPage:
        # 管理员含全部记录；访客/用户列表只含启用记录；稳定按 created_at ASC, id ASC 正序。
        try:
            count_stmt = select(func.count()).select_from(Music)
            list_stmt = select(Music)
            if not include_disabled:
                count_stmt = count_stmt.where(Music.is_enabled.is_(True))
                list_stmt = list_stmt.where(Music.is_enabled.is_(True))
            total = (await self.session.execute(count_stmt)).scalar_one()
            rows = (
                await self.session.execute(
                    list_stmt.order_by(Music.created_at.asc(), Music.id.asc())
                    .offset((query.page - 1) * query.page_size)
                    .limit(query.page_size)
                )
            ).scalars().all()
        except SQLAlchemyError as e:
            raise DatabaseException() from e
        if total == 0:
            total_pages = 0
        else:
            total_pages = ceil(total / query.page_size)
        return MusicPage(
            items=list(rows),
            page=query.page,
            page_size=query.page_size,
            total=total,
            total_pages=total_pages,
        )

    async def get_music(self, music_id: int) -> Music:
        return await self._fetch(music_id)

    async def update_music(self, music_id: int, data: MusicUpdate) -> Music:
        # 输入已在 schemas 完成校验与归一化，这里只应用 model_fields_set 中提交的字段。
        try:
            music = await self._fetch(music_id)
            if "title" in data.model_fields_set:
                music.title = data.title
            if "artist" in data.model_fields_set:
                music.artist = data.artist
            if "is_enabled" in data.model_fields_set:
                music.is_enabled = data.is_enabled
            await self.session.commit()
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseException() from e
        await self.session.refresh(music)
        return music

    async def delete_music(self, music_id: int) -> None:
        # 删除顺序固定：先提交停用，再清理文件，最后删除记录。
        # 任何后续失败都保留已停用记录，使访客不可见且管理员可重试。
        try:
            music = await self._fetch(music_id)
            music.is_enabled = False
            await self.session.commit()
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseException() from e

        # 文件子系统删除 MP3；文件已不存在视为成功。失败抛 SystemException，停用记录保留。
        await delete_audio(music.audio_url, self.storage)

        try:
            await self.session.delete(music)
            await self.session.commit()
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseException() from e
