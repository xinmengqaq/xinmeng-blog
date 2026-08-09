package com.xinmengqaq.springboot.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ErrorCode {

    SUCCESS("200", "请求成功"),
    PARAM_ERROR("400", "参数错误"),
    UNAUTHORIZED("401", "未登录或 Token 无效"),
    FORBIDDEN("403", "无权限操作"),
    NOT_FOUND("404", "数据不存在"),
    METHOD_NOT_ALLOWED("405", "请求方法不支持"),
    NOT_ACCEPTABLE("406", "请求内容无法接受"),
    REQUEST_TIMEOUT("408", "请求超时"),
    CONFLICT("409", "数据冲突"),
    PAYLOAD_TOO_LARGE("413", "请求体过大"),
    UNSUPPORTED_MEDIA_TYPE("415", "不支持的媒体类型"),
    UNPROCESSABLE_CONTENT("422", "请求内容无法处理"),
    TOO_MANY_REQUESTS("429", "请求过于频繁"),
    SYSTEM_ERROR("500", "系统异常"),
    SERVICE_UNAVAILABLE("503", "服务暂不可用");

    private final String code; // 请求码
    private final String message; // 信息
}
