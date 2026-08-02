package com.xinmengqaq.springboot.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminLoginDTO {

    /*
     * 笔记：[Spring] @NotBlank
     * JSR-303 字符串非空约束，拒绝 null 和空白字符串（纯空格也算空白），比 != null 更严格。
     * 只能用在 CharSequence（String）类型上，数值类型用 @NotNull，集合用 @NotEmpty。
     * message 自定义错误提示，校验失败由全局异常处理器提取后返回前端。
     */


    @NotBlank(message = "用户名不能为空")
    @Size(min = 1, max = 50, message = "用户名长度必须在1-50个字符之间")
    private String username; // 用户名


    @NotBlank(message = "密码不能为空")
    @Size(min=1,max=128,message="密码长度必须在1-128个字符之间")
    private String password; // 密码


    @NotBlank(message = "验证码ID不能为空")
    @Size(min=1,max=36,message="验证码ID长度必须在1-36个字符之间")
    private String captchaID; // 验证码ID


    @NotBlank(message = "验证码不能为空")
    @Size(min=4,max=4,message="验证码长度必须为4个字符")
    private String captchaCode; // 验证码


}

