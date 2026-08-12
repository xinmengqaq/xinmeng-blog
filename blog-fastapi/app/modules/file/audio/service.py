import asyncio
import tempfile
import uuid
from pathlib import Path

from mutagen import MutagenError
from mutagen.mp3 import MP3

from app.core.exceptions import BusinessException, SystemException
from app.modules.file.audio.schemas import AudioSaveResult
from app.modules.file.storage.base import StorageBackend

# 单文件大小上限：100 MB
MAX_AUDIO_SIZE = 100 * 1024 * 1024
# 只接受 audio/mpeg 这一种 MIME，防止伪装 MP3
ALLOWED_CONTENT_TYPE = "audio/mpeg"
# 分块读取的块大小：避免无界 await file.read() 一次性读入内存
CHUNK_SIZE = 1024 * 1024


def _generate_stored_name() -> str:
    # 服务端生成唯一名，不使用原始文件名（原始名可能重名、含恶意字符或泄露信息）
    return f"{uuid.uuid4().hex}.mp3"


def _parse_duration(path: str) -> int:
    # 纯同步函数，由 save_audio 通过 asyncio.to_thread 隔离，不阻塞事件循环
    try:
        audio = MP3(path)
    except MutagenError as e:
        # 无法识别为 MP3 / 损坏
        raise BusinessException(message="音频文件不符合要求") from e
    info = getattr(audio, "info", None)
    if info is None or info.length <= 0:
        raise BusinessException(message="音频文件不符合要求")
    return int(info.length * 1000)


async def _write_limited_temp(upload, tmp_path: Path) -> None:
    # 按块读取到受限临时文件，累计超过上限尽早拒绝，不留正式文件
    # 磁盘读写与 LocalStorage 一致用 asyncio.to_thread 隔离，不阻塞事件循环
    total = 0
    f = await asyncio.to_thread(open, tmp_path, "wb")
    try:
        while True:
            chunk = await upload.read(CHUNK_SIZE)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_AUDIO_SIZE:
                raise BusinessException(message="文件大小超过限制")
            await asyncio.to_thread(f.write, chunk)
    finally:
        await asyncio.to_thread(f.close)


async def save_audio(upload, storage: StorageBackend) -> AudioSaveResult:
    filename = getattr(upload, "filename", "") or ""
    content_type = getattr(upload, "content_type", "") or ""

    if not filename.lower().endswith(".mp3"):
        raise BusinessException(message="音频文件不符合要求")
    if content_type != ALLOWED_CONTENT_TYPE:
        raise BusinessException(message="音频文件不符合要求")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir) / "upload.mp3"
        await _write_limited_temp(upload, tmp_path)
        if tmp_path.stat().st_size == 0:
            raise BusinessException(message="文件为空")
        # Mutagen 解析在子线程执行：读取和解析是同步 I/O
        duration_ms = await asyncio.to_thread(_parse_duration, str(tmp_path))
        data = await asyncio.to_thread(tmp_path.read_bytes)

    audio_url = await storage.save(data, _generate_stored_name())
    return AudioSaveResult(audio_url=audio_url, duration_ms=duration_ms)


async def delete_audio(audio_url: str, storage: StorageBackend) -> None:
    # 只删自己管理的 URL；越界/外部地址不触盘；缺失文件由存储层返回幂等成功
    if not storage.owns(audio_url):
        return
    try:
        await storage.delete(audio_url)
    except OSError as e:
        raise SystemException(message="文件删除失败") from e
