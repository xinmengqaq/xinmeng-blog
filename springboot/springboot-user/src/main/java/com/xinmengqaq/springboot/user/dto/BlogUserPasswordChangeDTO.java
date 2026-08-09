package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 用户密码修改请求 DTO，包含当前密码和新密码
 */
@Data
public class BlogUserPasswordChangeDTO {

    @NotBlank(message = "当前密码不能为空")
    private String currentPassword;

    @NotBlank(message = "新密码不能为空")
    private String newPassword;

}