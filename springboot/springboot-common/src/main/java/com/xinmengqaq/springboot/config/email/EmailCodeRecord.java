package com.xinmengqaq.springboot.config.email;


import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class EmailCodeRecord {

    // 验证码
    private int code;

    // 错误次数
    private int errorCount;
}
