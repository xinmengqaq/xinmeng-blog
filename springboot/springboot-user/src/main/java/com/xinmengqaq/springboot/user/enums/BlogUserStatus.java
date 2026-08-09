package com.xinmengqaq.springboot.user.enums;


import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum BlogUserStatus {

    ENABLED("enabled", "启用"),
    DISABLED("disabled", "禁用"),
    PENDING_DELETION("pending_deletion", "待删除");

    private final String value;

    private final String description;

}
