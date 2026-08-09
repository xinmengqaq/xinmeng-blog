package com.xinmengqaq.springboot.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 管理员用户状态变更 DTO，只允许 enabled 或 disabled
 */
@Data
public class AdminBlogUserStatusDTO {

    @NotBlank(message = "状态不能为空")
    @Pattern(regexp = "enabled|disabled", message = "状态只能是 enabled 或 disabled")
    private String status;

}