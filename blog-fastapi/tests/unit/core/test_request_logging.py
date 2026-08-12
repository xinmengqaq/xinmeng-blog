import asyncio
from types import SimpleNamespace
from unittest.mock import Mock

from starlette.requests import Request
from starlette.responses import Response

from app.core import request_logging


def _request(headers: list[tuple[bytes, bytes]] | None = None) -> Request:
    return Request({
        "type": "http",
        "method": "GET",
        "path": "/health",
        "headers": headers or [],
        "client": ("127.0.0.1", 12345),
        "scheme": "http",
        "server": ("testserver", 80),
        "query_string": b"token=secret",
    })


def test_request_log_records_safe_result_and_returns_request_id(monkeypatch):
    test_logger = Mock()
    monkeypatch.setattr(request_logging, "logger", test_logger)
    monkeypatch.setattr(request_logging.time, "perf_counter", Mock(side_effect=[1.0, 1.025]))
    request = _request([(b"authorization", b"Bearer secret")])

    async def call_next(current_request: Request) -> Response:
        current_request.state.user_id = 7
        return Response(status_code=200)

    response = asyncio.run(request_logging.log_http_request(request, call_next))

    request_id = response.headers["X-Request-ID"]
    assert request_id
    test_logger.info.assert_called_once_with(
        "HTTP请求 方法={} 路径={} 状态码={} 耗时毫秒={} 客户端IP={} 用户ID={} 请求ID={}",
        "GET", "/health", 200, 25.0, "127.0.0.1", 7, request_id,
    )
    assert "secret" not in str(test_logger.info.call_args)


def test_request_log_accepts_safe_request_id(monkeypatch):
    test_logger = Mock()
    monkeypatch.setattr(request_logging, "logger", test_logger)
    request = _request([(b"x-request-id", b"client-request_123")])

    async def call_next(_: Request) -> Response:
        return Response(status_code=204)

    response = asyncio.run(request_logging.log_http_request(request, call_next))

    assert response.headers["X-Request-ID"] == "client-request_123"


def test_request_log_replaces_unsafe_request_id(monkeypatch):
    monkeypatch.setattr(request_logging, "logger", Mock())
    request = _request([(b"x-request-id", b"unsafe\nvalue")])

    async def call_next(_: Request) -> Response:
        return Response(status_code=200)

    response = asyncio.run(request_logging.log_http_request(request, call_next))

    assert response.headers["X-Request-ID"] != "unsafe\nvalue"
    assert "\n" not in response.headers["X-Request-ID"]


def test_request_log_records_500_and_reraises(monkeypatch):
    test_logger = Mock()
    monkeypatch.setattr(request_logging, "logger", test_logger)
    request = _request()

    async def call_next(_: Request) -> Response:
        raise RuntimeError("unexpected")

    try:
        asyncio.run(request_logging.log_http_request(request, call_next))
    except RuntimeError:
        pass
    else:
        raise AssertionError("RuntimeError was not reraised")

    assert test_logger.info.call_args.args[3] == 500
    assert request.state.request_id
