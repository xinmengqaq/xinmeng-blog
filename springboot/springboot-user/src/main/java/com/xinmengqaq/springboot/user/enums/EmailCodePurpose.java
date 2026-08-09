package com.xinmengqaq.springboot.user.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum EmailCodePurpose {

    //注册
    REGISTER("注册"),
    //重置密码
    RESET_PASSWORD("重置密码"),
    // 修改邮箱
    CHANGE_EMAIL("修改邮箱");

    // 状态值
    private final String value;

    }
