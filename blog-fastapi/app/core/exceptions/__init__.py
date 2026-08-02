from app.core.response_codes import ResponseCode, DEFAULT_MESSAGES


class AppException(Exception):
    # 应用异常的公共数据结构；子类通过不同类型表达业务失败和系统失败。
    # 异常对象只保存业务 code 和内部 message，HTTP 状态码由异常处理器统一决定。
    def __init__(
        self,
        *,
        code: str,
        message: str,
    ):
        super().__init__(message)
        self.code = code
        self.message = message


class BusinessException(AppException):
    # 可预期业务失败：文件非法、资源不存在、状态冲突
    # 对外返回业务 code（默认 "400"）、中文 message、data: null
    # message 由创建异常的业务代码提供，用于表达当前失败原因。
    def __init__(
        self,
        *,
        message: str,
        code: str = ResponseCode.BAD_REQUEST,
    ):
        super().__init__(code=code, message=message)


class SystemException(AppException):
    # 已识别的系统失败对外统一为 code="500" 和“系统异常”。
    # exc.message 保存具体原因供日志使用，异常处理器不会把它返回给客户端。
    def __init__(
        self,
        *,
        message: str = DEFAULT_MESSAGES[ResponseCode.INTERNAL_SERVER_ERROR],
        code: str = ResponseCode.INTERNAL_SERVER_ERROR,
    ):
        super().__init__(code=code, message=message)


class DatabaseException(SystemException):
    # 数据库失败复用 SystemException 的对外契约，避免暴露 SQL、表结构和驱动原文。
    def __init__(
        self,
        *,
        message: str = DEFAULT_MESSAGES[ResponseCode.INTERNAL_SERVER_ERROR],
        code: str = ResponseCode.INTERNAL_SERVER_ERROR,
    ):
        super().__init__(code=code, message=message)
