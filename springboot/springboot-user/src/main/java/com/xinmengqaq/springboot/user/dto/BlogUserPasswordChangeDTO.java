package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.nio.charset.StandardCharsets;

/**
 * 用户密码修改请求 DTO，包含当前密码和新密码
 */
@Data
public class BlogUserPasswordChangeDTO {

    @NotBlank(message = "当前密码不能为空")
    @Size(min = 8, max = 64, message = "当前密码长度必须在8-64个字符之间")
    private String currentPassword;

    @NotBlank(message = "新密码不能为空")
    @Size(min = 8, max = 64, message = "新密码长度必须在8-64个字符之间")
    private String newPassword;

    /**
     * 校验当前密码和新密码均未超过 BCrypt 字节上限。
     *
     * @return 两个密码均可被 BCrypt 完整处理时返回 true
     */
    @AssertTrue(message = "密码 UTF-8 编码不能超过72个字节")
    public boolean isPasswordWithinBcryptByteLimit() {
        return (currentPassword == null || currentPassword.getBytes(StandardCharsets.UTF_8).length <= 72)
                && (newPassword == null || newPassword.getBytes(StandardCharsets.UTF_8).length <= 72);
    }

}
