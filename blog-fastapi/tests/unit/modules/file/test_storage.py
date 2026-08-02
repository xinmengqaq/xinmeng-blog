import asyncio
from pathlib import Path
from uuid import uuid4

import pytest

from app.core.exceptions import SystemException
from app.modules.file.storage.dependencies import (
    get_admin_avatar_storage,
    get_article_cover_storage,
    get_site_background_storage,
    get_storage_backend,
)
from app.modules.file.storage.local_disk import LocalStorage


def test_save_writes_file_and_returns_url(tmp_path):
    base_dir = str(tmp_path / "articles" / "content")
    storage = LocalStorage(base_dir=base_dir, base_url="/files/articles/content")

    data = b"fake image content"
    filename = "20260720-abcd1234.png"

    file_url = asyncio.run(storage.save(data, filename))

    assert file_url == "/files/articles/content/20260720-abcd1234.png"

    file_path = tmp_path / "articles" / "content" / "20260720-abcd1234.png"
    assert file_path.exists()
    assert file_path.read_bytes() == data


def test_save_creates_nested_directory(tmp_path):
    base_dir = str(tmp_path / "deep" / "nested" / "path")
    storage = LocalStorage(base_dir=base_dir, base_url="/files/deep")

    assert not Path(base_dir).exists()

    asyncio.run(storage.save(b"data", "test.png"))

    assert Path(base_dir, "test.png").exists()


def test_save_raises_system_exception_on_write_failure(tmp_path):
    block_file = tmp_path / "block"
    block_file.write_text("I am a file, not a directory")

    storage = LocalStorage(
        base_dir=str(block_file / "content"),
        base_url="/files/test",
    )

    with pytest.raises(SystemException):
        asyncio.run(storage.save(b"data", "test.png"))


def test_save_does_not_leave_file_on_failure(tmp_path):
    block_file = tmp_path / "block"
    block_file.write_text("I am a file, not a directory")

    storage = LocalStorage(
        base_dir=str(block_file / "content"),
        base_url="/files/test",
    )

    with pytest.raises(SystemException):
        asyncio.run(storage.save(b"data", "test.png"))

    assert not (block_file / "content" / "test.png").exists()


def test_owns_accepts_only_urls_under_its_storage_root(tmp_path):
    storage = LocalStorage(
        base_dir=str(tmp_path / "articles" / "content"),
        base_url="/files/articles/content",
    )

    assert storage.owns("/files/articles/content/image.png")
    assert not storage.owns("/files/articles/content-other/image.png")
    assert not storage.owns("/files/articles/content/../cover/image.png")
    assert not storage.owns("https://example.com/image.png")


def test_delete_returns_whether_a_managed_file_was_removed(tmp_path):
    storage = LocalStorage(
        base_dir=str(tmp_path / "articles" / "content"),
        base_url="/files/articles/content",
    )
    file_url = asyncio.run(storage.save(b"content", "image.png"))

    assert asyncio.run(storage.delete(file_url)) is True
    assert asyncio.run(storage.delete(file_url)) is False


@pytest.mark.parametrize(
    ("storage_factory", "relative_directory", "base_url"),
    [
        pytest.param(
            get_storage_backend,
            Path("articles") / "content",
            "/files/articles/content",
            id="content-image",
        ),
        pytest.param(
            get_article_cover_storage,
            Path("articles") / "cover",
            "/files/articles/cover",
            id="article-cover",
        ),
        pytest.param(
            get_admin_avatar_storage,
            Path("admins") / "avatar",
            "/files/admins/avatar",
            id="admin-avatar",
        ),
        pytest.param(
            get_site_background_storage,
            Path("site") / "background",
            "/files/site/background",
            id="site-background",
        ),
    ],
)
def test_default_storage_writes_under_project_storage_from_any_working_directory(
    monkeypatch,
    tmp_path,
    storage_factory,
    relative_directory,
    base_url,
):
    project_storage_dir = Path(__file__).resolve().parents[4] / "storage"
    filename = f"pytest-{uuid4().hex}.jpg"
    expected_file = project_storage_dir / relative_directory / filename

    monkeypatch.chdir(tmp_path)
    try:
        file_url = asyncio.run(storage_factory().save(b"test image", filename))

        assert file_url == f"{base_url}/{filename}"
        assert expected_file.read_bytes() == b"test image"
        assert not (tmp_path / "storage" / relative_directory / filename).exists()
    finally:
        expected_file.unlink(missing_ok=True)
