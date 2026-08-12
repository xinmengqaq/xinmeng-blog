import asyncio
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import DatabaseException
from app.modules.file.image.enums import ContentImageCleanupResult
from app.modules.file.image.service import ImageService


CONTENT_URL = "/files/articles/content/20260729-image.png"


def _unreferenced_session() -> AsyncMock:
    session = AsyncMock()
    result = Mock()
    result.scalar_one_or_none.return_value = None
    session.execute.return_value = result
    return session


def _storage(*, owns: bool = True, deleted: bool = True) -> Mock:
    storage = Mock()
    storage.owns.return_value = owns
    storage.delete = AsyncMock(return_value=deleted)
    return storage


def test_cleanup_content_image_retains_file_when_any_article_references_url():
    storage = _storage()
    session = _unreferenced_session()
    session.execute.return_value.scalar_one_or_none.return_value = 1

    result = asyncio.run(ImageService(session, storage).cleanup_content_image(CONTENT_URL))

    assert result is ContentImageCleanupResult.RETAINED_IN_USE
    storage.delete.assert_not_awaited()


def test_cleanup_content_image_deletes_unreferenced_file():
    storage = _storage()
    session = _unreferenced_session()

    result = asyncio.run(ImageService(session, storage).cleanup_content_image(CONTENT_URL))

    assert result is ContentImageCleanupResult.DELETED
    storage.delete.assert_awaited_once_with(CONTENT_URL)


def test_cleanup_content_image_returns_already_absent_for_missing_file():
    storage = _storage(deleted=False)
    session = _unreferenced_session()

    result = asyncio.run(ImageService(session, storage).cleanup_content_image(CONTENT_URL))

    assert result is ContentImageCleanupResult.ALREADY_ABSENT
    storage.delete.assert_awaited_once_with(CONTENT_URL)


def test_cleanup_content_image_ignores_external_url_without_query_or_delete():
    storage = _storage(owns=False)
    session = _unreferenced_session()

    result = asyncio.run(
        ImageService(session, storage).cleanup_content_image("https://example.com/image.png")
    )

    assert result is ContentImageCleanupResult.EXTERNAL_IGNORED
    session.execute.assert_not_awaited()
    storage.delete.assert_not_awaited()


def test_cleanup_content_image_raises_database_exception_when_reference_query_fails():
    storage = _storage()
    session = _unreferenced_session()
    session.execute.side_effect = SQLAlchemyError("database unavailable")

    with pytest.raises(DatabaseException):
        asyncio.run(ImageService(session, storage).cleanup_content_image(CONTENT_URL))

    storage.delete.assert_not_awaited()


def test_cleanup_content_image_propagates_delete_failure():
    storage = _storage()
    storage.delete.side_effect = OSError("storage unavailable")
    session = _unreferenced_session()

    with pytest.raises(OSError):
        asyncio.run(ImageService(session, storage).cleanup_content_image(CONTENT_URL))
