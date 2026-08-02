import asyncio
from unittest.mock import AsyncMock

from app.modules.file.router import _read_upload_content
from app.modules.file.service import MAX_CONTENT_IMAGE_SIZE


def test_upload_reader_reads_at_most_size_limit_plus_one_byte():
    file = AsyncMock()
    file.read.return_value = b"image"

    content = asyncio.run(_read_upload_content(file))

    assert content == b"image"
    file.read.assert_awaited_once_with(MAX_CONTENT_IMAGE_SIZE + 1)
