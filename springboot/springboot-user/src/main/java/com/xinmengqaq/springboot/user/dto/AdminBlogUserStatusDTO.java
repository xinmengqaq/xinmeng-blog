package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 管理员变更普通用户登录状态的请求参数。
 */
@Data
public class AdminBlogUserStatusDTO {

    @NotBlank(message = "状态不能为空")
    @Pattern(regexp = "enabled|disabled", message = "状态只能是 enabled 或 disabled")
    private String status;
}
