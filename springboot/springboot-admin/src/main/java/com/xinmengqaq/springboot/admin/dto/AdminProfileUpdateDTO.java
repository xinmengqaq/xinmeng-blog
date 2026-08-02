package com.xinmengqaq.springboot.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminProfileUpdateDTO {

    @NotBlank(message = "管理员名称不能为空")
    private String name;

    @NotBlank(message = "管理员用户名不能为空")
    private String username;

    private String avatar;
}

