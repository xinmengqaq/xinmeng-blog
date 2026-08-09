package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 用户资料修改请求 DTO，只接收昵称
 */
@Data
public class BlogUserProfileUpdateDTO {

    @NotBlank(message = "昵称不能为空")
    @Size(min = 1, max = 50, message = "昵称长度必须在1-50个字符之间")
    private String nickname;

}