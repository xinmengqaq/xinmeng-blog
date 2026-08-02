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
    CONFLICT("409", "数据冲突"),
    SYSTEM_ERROR("500", "系统异常");

    private final String code; // 请求码
    private final String message; // 信息
}
