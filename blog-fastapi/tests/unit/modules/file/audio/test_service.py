import asyncio
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import BusinessException, SystemException
from app.modules.file.audio import service as audio_service
from app.modules.file.audio.service import (
    CHUNK_SIZE,
    MAX_AUDIO_SIZE,
    delete_audio,
    save_audio,
)


# 最小合法 MPEG-1 Layer III 帧（128kbps / 44100Hz），重复多帧得到正时长
def _mp3_bytes() -> bytes:
    def frame(n=417):
        b = bytearray(n)
        b[0] = 0xFF
        b[1] = 0xFB
        b[2] = 0x90
        b[3] = 0x00
        return bytes(b)

    return frame() * 20


class _Upload:
    def __init__(self, filename, content_type, content):
        self.filename = filename
        self.content_type = content_type
        self._content = content
        self._pos = 0
        self.read_sizes = []

    async def read(self, size=-1):
        if size == -1:
            data = self._content[self._pos :]
            self._pos = len(self._content)
            return data
        self.read_sizes.append(size)
        chunk = self._content[self._pos : self._pos + size]
        self._pos += len(chunk)
        return chunk


class _FakeStorage:
    def __init__(self, base_url="/files/music/audio"):
        self.base_url = base_url
        self.saved = []
        self.deleted = []

    async def save(self, data: bytes, filename: str) -> str:
        self.saved.append((data, filename))
        return f"{self.base_url}/{filename}"

    def owns(self, file_url: str) -> bool:
        return file_url.startswith(f"{self.base_url}/")

    async def delete(self, file_url: str) -> bool:
        self.deleted.append(file_url)
        return True


def _run(coro):
    return asyncio.run(coro)


# ===== BDD-002 非法音频不会留下正式文件 =====

def test_save_audio_rejects_empty_file():
    # 假如 上传内容为空
    # 当 音频子系统处理上传
    # 那么 请求按参数错误失败（BusinessException）
    # 并且 不保存正式文件
    storage = _FakeStorage()
    upload = _Upload("song.mp3", "audio/mpeg", b"")

    with pytest.raises(BusinessException):
        _run(save_audio(upload, storage))

    assert storage.saved == []


def test_save_audio_rejects_non_mp3_extension():
    # 假如 上传文件扩展名不是 .mp3
    # 当 音频子系统处理上传
    # 那么 按参数错误失败
    # 并且 不保存正式文件
    storage = _FakeStorage()
    upload = _Upload("song.wav", "audio/mpeg", _mp3_bytes())

    with pytest.raises(BusinessException):
        _run(save_audio(upload, storage))

    assert storage.saved == []


def test_save_audio_rejects_fake_mp3_wrong_mime():
    # 假如 扩展名为 .mp3 但 MIME 不是 audio/mpeg（伪装成 MP3）
    # 当 音频子系统处理上传
    # 那么 按参数错误失败
    # 并且 不保存正式文件
    storage = _FakeStorage()
    upload = _Upload("song.mp3", "application/octet-stream", _mp3_bytes())

    with pytest.raises(BusinessException):
        _run(save_audio(upload, storage))

    assert storage.saved == []


def test_save_audio_rejects_corrupted_mp3():
    # 假如 扩展名和 MIME 合法但真实内容无法被 Mutagen 解析
    # 当 音频子系统处理上传
    # 那么 按参数错误失败
    # 并且 不保存正式文件
    storage = _FakeStorage()
    upload = _Upload("song.mp3", "audio/mpeg", b"\x00\x01 corrupt not really mp3" * 10)

    with pytest.raises(BusinessException):
        _run(save_audio(upload, storage))

    assert storage.saved == []


def test_save_audio_rejects_oversize_file(monkeypatch):
    # 假如 上传内容超过 100 MB
    # 当 音频子系统处理上传
    # 那么 按参数错误失败
    # 并且 不保存正式文件
    monkeypatch.setattr(audio_service, "MAX_AUDIO_SIZE", 10)
    storage = _FakeStorage()
    upload = _Upload("song.mp3", "audio/mpeg", b"x" * 20)

    with pytest.raises(BusinessException):
        _run(save_audio(upload, storage))

    assert storage.saved == []


# ===== 合法 MP3 成功路径 =====

def test_save_audio_returns_url_and_positive_duration():
    # 假如 上传的是合法 MP3
    # 当 音频子系统处理上传
    # 那么 返回 audio_url 且 duration_ms > 0
    # 并且 地址位于 /files/music/audio/* 之下
    storage = _FakeStorage()
    upload = _Upload("song.mp3", "audio/mpeg", _mp3_bytes())

    result = _run(save_audio(upload, storage))

    assert result.audio_url.startswith("/files/music/audio/")
    assert result.duration_ms > 0


def test_save_audio_generated_name_excludes_original_filename():
    # 假如 上传文件名为原始用户文件名
    # 当 音频子系统保存文件
    # 那么 保存用的服务端文件名不包含原始文件名
    storage = _FakeStorage()
    upload = _Upload("my_song.mp3", "audio/mpeg", _mp3_bytes())

    _run(save_audio(upload, storage))

    stored_name = storage.saved[0][1]
    assert "my_song" not in stored_name
    assert stored_name.endswith(".mp3")


def test_save_audio_saves_once_with_parsed_bytes():
    # 假如 上传的是合法 MP3
    # 当 音频子系统保存文件
    # 那么 存储后端只被调用一次，且内容是解析后的真实文件字节
    storage = _FakeStorage()
    content = _mp3_bytes()
    upload = _Upload("song.mp3", "audio/mpeg", content)

    _run(save_audio(upload, storage))

    assert len(storage.saved) == 1
    assert storage.saved[0][0] == content


# ===== 分块受限读取与线程隔离 =====

def test_save_audio_reads_in_bounded_chunks():
    # 假如 上传内容较大
    # 当 音频子系统读取上传
    # 那么 按固定块大小分块读取，不一次性无界读入内存
    storage = _FakeStorage()
    content = _mp3_bytes()
    upload = _Upload("song.mp3", "audio/mpeg", content)

    _run(save_audio(upload, storage))

    assert upload.read_sizes and all(s <= CHUNK_SIZE for s in upload.read_sizes)


def test_save_audio_isolates_sync_io_in_thread(monkeypatch):
    # 假如 上传的是合法 MP3
    # 当 音频子系统执行 Mutagen 解析
    # 那么 同步 I/O 通过线程隔离，不阻塞事件循环
    import asyncio as aio

    calls = []
    real = aio.to_thread

    async def fake(func, *args, **kwargs):
        calls.append(func.__name__)
        return await real(func, *args, **kwargs)

    monkeypatch.setattr(aio, "to_thread", fake)
    storage = _FakeStorage()
    upload = _Upload("song.mp3", "audio/mpeg", _mp3_bytes())

    result = _run(save_audio(upload, storage))

    assert "_parse_duration" in calls
    assert result.duration_ms > 0


# ===== 幂等删除 =====

def test_delete_audio_removes_owned_url():
    # 假如 audio_url 属于本存储根
    # 当 音频子系统删除
    # 那么 调用存储后端删除并返回成功
    storage = _FakeStorage()

    _run(delete_audio("/files/music/audio/abc.mp3", storage))

    assert storage.deleted == ["/files/music/audio/abc.mp3"]


def test_delete_audio_ignores_unowned_or_external_url():
    # 假如 audio_url 不属于本存储根（越界或外部地址）
    # 当 音频子系统删除
    # 那么 不触盘并幂等成功
    storage = _FakeStorage()

    _run(delete_audio("/files/articles/content/abc.mp3", storage))
    _run(delete_audio("https://example.com/a.mp3", storage))

    assert storage.deleted == []


def test_delete_audio_missing_file_is_idempotent(monkeypatch):
    # 假如 文件已不存在
    # 当 音频子系统删除
    # 那么 按成功处理，不抛异常
    storage = _FakeStorage()
    storage.delete = AsyncMock(return_value=False)

    _run(delete_audio("/files/music/audio/abc.mp3", storage))

    storage.delete.assert_awaited_once_with("/files/music/audio/abc.mp3")


def test_delete_audio_converts_oserror_to_system_exception(monkeypatch):
    # 假如 存储删除发生 OSError
    # 当 音频子系统删除
    # 那么 转换为系统异常
    storage = _FakeStorage()
    storage.delete = AsyncMock(side_effect=OSError("disk error"))

    with pytest.raises(SystemException):
        _run(delete_audio("/files/music/audio/abc.mp3", storage))
