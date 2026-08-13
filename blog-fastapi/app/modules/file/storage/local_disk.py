import asyncio
import stat
from datetime import datetime
from pathlib import Path

from app.core.exceptions import SystemException
from app.modules.file.storage.base import StorageBackend


class LocalStorage(StorageBackend):

    def __init__(self, base_dir: str, base_url: str):
        self.base_dir = base_dir
        self.base_url = base_url

    async def save(self, data: bytes, filename: str) -> str:
        file_path = Path(self.base_dir) / filename
        try:
            await asyncio.to_thread(self._write_file, file_path, data)
        except OSError as e:
            raise SystemException(message=f"文件保存失败: {e}") from e
        return f"{self.base_url}/{filename}"

    def owns(self, file_url: str) -> bool:
        # owns 与 delete 共用同一套 URL 和路径穿越校验，避免判断与实际删除规则不一致。
        return self._managed_path(file_url) is not None

    async def delete(self, file_url: str) -> bool:
        # file_url 为空或不属于当前 base_url 时不操作，外部历史地址保持不触盘。
        file_path = self._managed_path(file_url)
        if file_path is None:
            return False
        # asyncio.to_thread：把同步删文件丢线程池，不阻塞事件循环（和 save 同理）。
        return await asyncio.to_thread(self._delete_file, file_path)

    async def list_file_urls_older_than(
        self,
        cutoff: datetime,
        limit: int,
    ) -> list[str]:
        if limit <= 0:
            return []
        return await asyncio.to_thread(
            self._list_file_urls_older_than,
            cutoff.timestamp(),
            limit,
        )

    def _managed_path(self, file_url: str) -> Path | None:
        if not file_url or not file_url.startswith(f"{self.base_url}/"):
            return None

        # 从 file_url 去掉 base_url 前缀，得到文件名，比如 /cover.jpg 变成 cover.jpg。
        # lstrip("/") 去掉前导斜杠，避免 Path 拼接时把 base_dir 覆盖成绝对路径。
        filename = file_url[len(self.base_url):].lstrip("/")
        # 构建文件路径，比如 /app/storage/cover.jpg。
        base = Path(self.base_dir).resolve()
        # Path.resolve()：解析成绝对路径，消除 .. 等相对路径。
        file_path = (base / filename).resolve()
        # 防路径穿越：解析后必须仍在 base_dir 内。
        # Path.is_relative_to(base)：确认路径没有逃出当前存储目录。
        if not file_path.is_relative_to(base):
            return None
        return file_path

    def _write_file(self, file_path: Path, data: bytes) -> None:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(data)

    def _list_file_urls_older_than(self, cutoff_timestamp: float, limit: int) -> list[str]:
        base = Path(self.base_dir).resolve()
        if not base.exists():
            return []
        if not base.is_dir():
            raise NotADirectoryError(base)

        candidates: list[tuple[float, str]] = []
        for file_path in base.iterdir():
            file_stat = file_path.stat(follow_symlinks=False)
            if not stat.S_ISREG(file_stat.st_mode) or file_stat.st_mtime >= cutoff_timestamp:
                continue
            candidates.append((file_stat.st_mtime, file_path.name))

        candidates.sort()
        return [f"{self.base_url}/{filename}" for _, filename in candidates[:limit]]

    def _delete_file(self, file_path: Path) -> bool:
        # 文件不存在静默并返回 False（可能已删）；存在则删除，失败仍抛 OSError。
        if not file_path.exists():
            return False
        # Path.unlink() 会删除实际文件；已由上面的 exists() 保证不因缺失失败。
        file_path.unlink()
        return True
