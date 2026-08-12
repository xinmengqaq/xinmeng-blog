import asyncio
from unittest.mock import AsyncMock

from app.modules.file.router import _read_upload_content
from app.modules.file.image.service import MAX_CONTENT_IMAGE_SIZE
from app.main import app


def test_upload_reader_reads_at_most_size_limit_plus_one_byte():
    file = AsyncMock()
    file.read.return_value = b"image"

    content = asyncio.run(_read_upload_content(file))

    assert content == b"image"
    file.read.assert_awaited_once_with(MAX_CONTENT_IMAGE_SIZE + 1)


def test_file_router_registers_admin_and_user_image_routes():
    paths = app.openapi()["paths"]

    assert "/api/admin/files/articles/{article_id}/cover" in paths
    assert "/api/user/files/profile/avatar" in paths
