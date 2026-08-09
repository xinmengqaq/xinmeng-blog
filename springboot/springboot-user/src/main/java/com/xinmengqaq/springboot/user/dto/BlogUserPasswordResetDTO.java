package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 找回密码请求 DTO，包含邮箱、邮箱验证码和新密码
 */
@Data
public class BlogUserPasswordResetDTO {

    @NotBlank(message = "邮箱不能为空")
    @Size(max = 320, message = "邮箱长度不能超过320个字符")
    private String email;

    @NotBlank(message = "邮箱验证码不能为空")
    @Size(min = 6, max = 6, message = "邮箱验证码长度必须为6位数字")
    private String emailCode;

    @NotBlank(message = "新密码不能为空")
    @Size(min = 8, max = 64, message = "密码长度必须在8-64个字符之间")
    private String newPassword;

}