from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


PROJECT_STORAGE_DIR = Path(__file__).resolve().parents[3] / "storage"


def test_static_files_use_project_storage_from_any_working_directory(monkeypatch, tmp_path):
    relative_path = Path("admins") / "avatar" / f"pytest-{uuid4().hex}.jpg"
    physical_file = PROJECT_STORAGE_DIR / relative_path
    file_url = f"/files/{relative_path.as_posix()}"
    content = b"static image"

    physical_file.parent.mkdir(parents=True, exist_ok=True)
    physical_file.write_bytes(content)
    monkeypatch.chdir(tmp_path)
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            served_response = client.get(file_url)

        assert served_response.status_code == 200
        assert served_response.content == content
        assert served_response.headers["content-type"] == "image/jpeg"
    finally:
        physical_file.unlink(missing_ok=True)


def test_static_file_errors_keep_native_http_semantics():
    with TestClient(app, raise_server_exceptions=False) as client:
        missing_response = client.get(f"/files/admins/avatar/missing-{uuid4().hex}.jpg")
        method_not_allowed_response = client.post(f"/files/admins/avatar/missing-{uuid4().hex}.jpg")

    assert missing_response.status_code == 404
    assert missing_response.headers["content-type"] == "application/json"
    assert missing_response.json() == {"detail": "Not Found"}

    assert method_not_allowed_response.status_code == 405
    assert method_not_allowed_response.headers["content-type"] == "application/json"
    assert method_not_allowed_response.json() == {"detail": "Method Not Allowed"}
