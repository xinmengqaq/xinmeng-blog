import asyncio
from types import SimpleNamespace
from unittest.mock import Mock

from app.core.exceptions import BusinessException, SystemException
from app.core.exceptions import exception_handlers


def _request() -> SimpleNamespace:
    return SimpleNamespace(
        method="GET",
        url=SimpleNamespace(path="/api/test"),
        state=SimpleNamespace(request_id="request-123"),
    )


def test_business_exception_uses_loguru_info(monkeypatch):
    test_logger = Mock()
    monkeypatch.setattr(exception_handlers, "DEBUG", True)
    monkeypatch.setattr(exception_handlers, "logger", test_logger)

    asyncio.run(
        exception_handlers.business_exception_handler(
            _request(),
            BusinessException(code="404", message="数据不存在"),
        )
    )

    test_logger.info.assert_called_once_with(
        "业务异常 方法={} 路径={} 业务码={} 请求ID={}",
        "GET",
        "/api/test",
        "404",
        "request-123",
    )


def test_system_exception_uses_loguru_with_exception(monkeypatch):
    test_logger = Mock()
    exception_logger = Mock()
    test_logger.opt.return_value = exception_logger
    monkeypatch.setattr(exception_handlers, "logger", test_logger)
    exc = SystemException(message="数据库不可用")

    asyncio.run(exception_handlers.system_exception_handler(_request(), exc))

    test_logger.opt.assert_called_once_with(exception=exc)
    exception_logger.error.assert_called_once_with(
        "系统异常 方法={} 路径={} 业务码={} 内部信息={} 请求ID={}",
        "GET",
        "/api/test",
        "500",
        "数据库不可用",
        "request-123",
    )


def test_unhandled_exception_uses_loguru_with_exception(monkeypatch):
    test_logger = Mock()
    exception_logger = Mock()
    test_logger.opt.return_value = exception_logger
    monkeypatch.setattr(exception_handlers, "logger", test_logger)
    exc = RuntimeError("unexpected")

    asyncio.run(exception_handlers.unhandled_exception_handler(_request(), exc))

    test_logger.opt.assert_called_once_with(exception=exc)
    exception_logger.error.assert_called_once_with(
        "未处理异常 方法={} 路径={} 请求ID={}",
        "GET",
        "/api/test",
        "request-123",
    )
