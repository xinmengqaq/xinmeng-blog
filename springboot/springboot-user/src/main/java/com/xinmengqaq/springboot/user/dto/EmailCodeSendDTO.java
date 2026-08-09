package com.xinmengqaq.springboot.user.dto;

import com.xinmengqaq.springboot.user.aop.CaptchaCarrier;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 邮箱验证码发送请求 DTO，包含邮箱、图形验证码 ID 和图形验证码
 */
@Data
public class EmailCodeSendDTO implements CaptchaCarrier {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    @Size(max = 320, message = "邮箱长度不能超过320个字符")
    private String email;

    @NotBlank(message = "验证码ID不能为空")
    @Size(min = 1, max = 36, message = "验证码ID长度必须在1-36个字符之间")
    private String captchaId;

    @NotBlank(message = "验证码不能为空")
    @Size(min = 4, max = 4, message = "验证码长度必须为4个字符")
    private String captchaCode;

}