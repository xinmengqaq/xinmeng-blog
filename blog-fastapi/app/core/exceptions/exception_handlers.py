import os

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler as fastapi_http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response
from loguru import logger

from app.core.exceptions import BusinessException, SystemException
from app.core.response_codes import ResponseCode, DEFAULT_MESSAGES

DEBUG = os.getenv("APP_ENV", "development") == "development"


def http_status_from_code(code: str, default: int = 400) -> int:
    try:
        status_code = int(code)
    except (TypeError, ValueError):
        return default
    return status_code if 400 <= status_code <= 599 else default


async def business_exception_handler(request: Request, exc: BusinessException) -> JSONResponse:
    # 业务异常是预期分支；开发环境记录请求位置和业务码，便于定位调用链。
    if DEBUG:
        logger.info(
            "业务异常 方法={} 路径={} 业务码={} 请求ID={}",
            request.method, request.url.path, exc.code,
            request.state.request_id,
        )
    return JSONResponse(
        status_code=http_status_from_code(exc.code),
        content={"code": exc.code, "message": exc.message, "data": None},
    )


async def system_exception_handler(request: Request, exc: SystemException) -> JSONResponse:
    # 系统异常对外统一为 code="500" 和“系统异常”，具体原因只保存在日志。
    logger.opt(exception=exc).error(
        "系统异常 方法={} 路径={} 业务码={} 内部信息={} 请求ID={}",
        request.method, request.url.path, exc.code, exc.message,
        getattr(request.state, "request_id", None),
    )
    return JSONResponse(
        status_code=500,
        headers={"X-Request-ID": request.state.request_id},
        content={
            "code": ResponseCode.INTERNAL_SERVER_ERROR,
            "message": DEFAULT_MESSAGES[ResponseCode.INTERNAL_SERVER_ERROR],
            "data": None,
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # 未识别异常统一进入兜底处理，避免内部异常细节直接返回客户端。
    logger.opt(exception=exc).error(
        "未处理异常 方法={} 路径={} 请求ID={}",
        request.method, request.url.path,
        getattr(request.state, "request_id", None),
    )
    return JSONResponse(
        status_code=500,
        headers={"X-Request-ID": request.state.request_id},
        content={
            "code": ResponseCode.INTERNAL_SERVER_ERROR,
            "message": DEFAULT_MESSAGES[ResponseCode.INTERNAL_SERVER_ERROR],
            "data": None,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # FastAPI 的请求校验异常转换为统一业务响应，客户端不需要理解内部字段结构。
    # 对外统一 code="400"、message="参数错误"，不暴露内部字段结构
    return JSONResponse(
        status_code=400,
        content={
            "code": ResponseCode.BAD_REQUEST,
            "message": DEFAULT_MESSAGES[ResponseCode.BAD_REQUEST],
            "data": None,
        },
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> Response:
    # 静态资源是浏览器资源，不走业务错误信封。
    if request.url.path.startswith("/files/") and exc.status_code in (404, 405):
        return await fastapi_http_exception_handler(request, exc)

    # 框架级 HTTP 异常统一转换为业务响应，常见于路由不存在或方法不允许。
    # 保留框架给出的 HTTP 状态，已知状态使用项目统一中文消息。
    code = str(exc.status_code)
    try:
        message = DEFAULT_MESSAGES[ResponseCode(code)]
    except ValueError:
        message = "请求失败"
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": code, "message": message, "data": None},
    )


class ExceptionHandlerRegistry:
    def __init__(self, app: FastAPI):
        self.app = app

    def register_all(self) -> None:
        # FastAPI 按异常类型匹配处理器，未命中具体类型时沿继承关系回退。
        self.app.add_exception_handler(BusinessException, business_exception_handler)
        self.app.add_exception_handler(SystemException, system_exception_handler)
        self.app.add_exception_handler(RequestValidationError, validation_exception_handler)
        self.app.add_exception_handler(StarletteHTTPException, http_exception_handler)
        self.app.add_exception_handler(Exception, unhandled_exception_handler)
