from enum import StrEnum


class ResponseCode(StrEnum):
    # 响应码采用字符串数字，并与错误响应的 HTTP 状态保持一致。
    SUCCESS = "200"                    # 请求成功
    BAD_REQUEST = "400"                # 参数错误，或具体中文参数说明
    UNAUTHORIZED = "401"               # 未登录或 Token 无效
    FORBIDDEN = "403"                  # 无权限操作
    NOT_FOUND = "404"                  # 数据不存在，或具体中文资源说明
    METHOD_NOT_ALLOWED = "405"         # 请求方法不支持
    NOT_ACCEPTABLE = "406"             # 请求内容无法接受
    REQUEST_TIMEOUT = "408"            # 请求超时
    CONFLICT = "409"                   # 数据冲突，或具体中文冲突说明
    PAYLOAD_TOO_LARGE = "413"          # 请求体过大
    UNSUPPORTED_MEDIA_TYPE = "415"     # 不支持的媒体类型
    UNPROCESSABLE_CONTENT = "422"      # 请求内容无法处理
    TOO_MANY_REQUESTS = "429"          # 请求过于频繁
    INTERNAL_SERVER_ERROR = "500"      # 系统异常
    SERVICE_UNAVAILABLE = "503"        # 服务暂不可用


# 默认消息用于构造统一响应；具体业务场景可以传入更准确的 message。
DEFAULT_MESSAGES = {
    ResponseCode.SUCCESS: "请求成功",
    ResponseCode.BAD_REQUEST: "参数错误",
    ResponseCode.UNAUTHORIZED: "未登录或 Token 无效",
    ResponseCode.FORBIDDEN: "无权限操作",
    ResponseCode.NOT_FOUND: "数据不存在",
    ResponseCode.METHOD_NOT_ALLOWED: "请求方法不支持",
    ResponseCode.NOT_ACCEPTABLE: "请求内容无法接受",
    ResponseCode.REQUEST_TIMEOUT: "请求超时",
    ResponseCode.CONFLICT: "数据冲突",
    ResponseCode.PAYLOAD_TOO_LARGE: "请求体过大",
    ResponseCode.UNSUPPORTED_MEDIA_TYPE: "不支持的媒体类型",
    ResponseCode.UNPROCESSABLE_CONTENT: "请求内容无法处理",
    ResponseCode.TOO_MANY_REQUESTS: "请求过于频繁",
    ResponseCode.INTERNAL_SERVER_ERROR: "系统异常",
    ResponseCode.SERVICE_UNAVAILABLE: "服务暂不可用",
}
