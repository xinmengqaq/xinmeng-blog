package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 修改邮箱-确认请求 DTO，校验当前密码、新邮箱和邮箱验证码
 */
@Data
public class BlogUserEmailChangeDTO {

    @NotBlank(message = "当前密码不能为空")
    private String currentPassword;

    @NotBlank(message = "新邮箱不能为空")
    @Size(max = 320, message = "邮箱长度不能超过320个字符")
    private String newEmail;

    @NotBlank(message = "邮箱验证码不能为空")
    @Size(min = 6, max = 6, message = "邮箱验证码长度必须为6位数字")
    private String emailCode;

}