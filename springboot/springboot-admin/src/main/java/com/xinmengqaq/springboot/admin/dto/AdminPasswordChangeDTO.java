package com.xinmengqaq.springboot.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminPasswordChangeDTO {

    /**
     * 旧密码
     */
    @NotBlank(message = "旧密码不能为空")
    private String oldPassword;

    /**
     * 新密码
     */
    /*
     * 笔记：[Spring] @Size
     * JSR-303 长度约束，min/max 限定字符串长度或集合元素个数范围。
     * 字符串验的是字符数（不是字节数），集合验的是 size()。null 值视为合法（通过校验），所以常和 @NotNull/@NotBlank 配合用。
     * 这里限定新密码 6-50 位，先 @NotBlank 拒空再 @Size 限长度。
     */
    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, max = 50, message = "新密码长度必须在 6-50 位之间")
    private String newPassword;
}

