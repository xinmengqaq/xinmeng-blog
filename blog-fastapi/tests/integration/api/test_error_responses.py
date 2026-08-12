from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app, raise_server_exceptions=False)


def test_unknown_api_route_returns_http_404_with_unified_body():
    response = client.get("/api/route-that-does-not-exist")

    assert response.status_code == 404
    assert response.json() == {
        "code": "404",
        "message": "数据不存在",
        "data": None,
    }
    assert response.headers["X-Request-ID"]


def test_safe_request_id_is_returned_without_logging_query_or_credentials():
    response = client.get(
        "/health?token=secret",
        headers={
            "Authorization": "Bearer secret",
            "X-Request-ID": "frontend-request_123",
        },
    )

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "frontend-request_123"


def test_unsupported_api_method_returns_http_405_with_unified_body():
    response = client.post("/health")

    assert response.status_code == 405
    assert response.json() == {
        "code": "405",
        "message": "请求方法不支持",
        "data": None,
    }
