package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.nio.charset.StandardCharsets;

/**
 * 待删除账号恢复请求 DTO，包含邮箱和密码
 */
@Data
public class BlogUserRestoreDTO {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    @Size(max = 320, message = "邮箱长度不能超过320个字符")
    private String email;

    @NotBlank(message = "密码不能为空")
    @Size(min = 8, max = 64, message = "密码长度必须在8-64个字符之间")
    private String password;

    /**
     * 校验密码未超过 BCrypt 字节上限。
     *
     * @return 密码可被 BCrypt 完整处理时返回 true
     */
    @AssertTrue(message = "密码 UTF-8 编码不能超过72个字节")
    public boolean isPasswordWithinBcryptByteLimit() {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

}
