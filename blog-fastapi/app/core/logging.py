import sys

from loguru import logger

from app.core.config import DEBUG, settings


def setup_logging() -> None:
    # 应用日志在启动阶段集中初始化，避免各模块重复配置 handler。
    # 不接管 Uvicorn 的日志配置，应用日志与服务器日志保持各自的输出职责。

    # 移除 Loguru 默认 handler，避免默认输出与显式配置的 handler 重复。
    logger.remove()

    # 级别优先用配置；未配置时按运行环境自动：开发 DEBUG，生产 INFO
    level = settings.log_level or ("DEBUG" if DEBUG else "INFO")
    if DEBUG:
        # 开发环境保留颜色和调用位置，便于定位问题。
        logger.add(
            sys.stderr,
            level=level,
            format="{time:HH:mm:ss.SSS} | {level:<8} | {name}:{function}:{line} - {message}",
            colorize=True,
            backtrace=True,
            diagnose=False,   # 禁用局部变量诊断，避免密码和 Token 等敏感值进入日志。
        )
    else:
        # 生产环境只输出 INFO，去掉颜色并使用简洁格式，降低日志噪声和敏感信息暴露面。
        logger.add(
            sys.stderr,
            level=level,
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level:<8} | {name} - {message}",
            colorize=False,
            backtrace=True,   # 保留调用堆栈帮助排错；变量值由 diagnose=False 负责隔离。
            diagnose=False,
        )
