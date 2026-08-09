package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 修改邮箱-发送验证码请求 DTO，校验当前密码、新邮箱和图形验证码
 */
@Data
public class BlogUserEmailCodeSendDTO {

    @NotBlank(message = "当前密码不能为空")
    private String currentPassword;

    @NotBlank(message = "新邮箱不能为空")
    @Size(max = 320, message = "邮箱长度不能超过320个字符")
    private String newEmail;

    @NotBlank(message = "验证码ID不能为空")
    @Size(min = 1, max = 36, message = "验证码ID长度必须在1-36个字符之间")
    private String captchaId;

    @NotBlank(message = "验证码不能为空")
    @Size(min = 4, max = 4, message = "验证码长度必须为4个字符")
    private String captchaCode;

}