package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.nio.charset.StandardCharsets;

/**
 * 修改邮箱-确认请求 DTO，校验当前密码、新邮箱和邮箱验证码
 */
@Data
public class BlogUserEmailChangeDTO {

    @NotBlank(message = "当前密码不能为空")
    @Size(min = 8, max = 64, message = "当前密码长度必须在8-64个字符之间")
    private String currentPassword;

    @NotBlank(message = "新邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    @Size(max = 320, message = "邮箱长度不能超过320个字符")
    private String newEmail;

    @NotBlank(message = "邮箱验证码不能为空")
    @Pattern(regexp = "\\d{6}", message = "邮箱验证码必须为6位数字")
    private String emailCode;

    /**
     * 校验当前密码未超过 BCrypt 字节上限。
     *
     * @return 当前密码可被 BCrypt 完整处理时返回 true
     */
    @AssertTrue(message = "密码 UTF-8 编码不能超过72个字节")
    public boolean isPasswordWithinBcryptByteLimit() {
        return currentPassword == null || currentPassword.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

}
