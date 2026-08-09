package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 待删除账号恢复请求 DTO，包含邮箱和密码
 */
@Data
public class BlogUserRestoreDTO {

    @NotBlank(message = "邮箱不能为空")
    private String email;

    @NotBlank(message = "密码不能为空")
    private String password;

}