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


def test_unsupported_api_method_returns_http_405_with_unified_body():
    response = client.post("/health")

    assert response.status_code == 405
    assert response.json() == {
        "code": "405",
        "message": "请求方法不支持",
        "data": None,
    }
