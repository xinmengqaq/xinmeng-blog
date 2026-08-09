package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import lombok.Data;


@Data
public class BlogUserLoginDTO {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式错误")
    @Size(max = 50, message = "邮箱不能超过50个字符")
    private String email;

    @NotNull(message = "密码不能为空")
    @Size(min =8, max=64, message = "密码长度必须在8到64之间")
    private String password;

    @NotNull(message = "是否记住登录状态不能为空")
    private Boolean rememberMe = false;   // 可空，默认 false
}
