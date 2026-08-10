package com.xinmengqaq.springboot.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 用户资料修改请求 DTO，只接收昵称
 */
@Data
public class BlogUserProfileUpdateDTO {

    @NotBlank(message = "昵称不能为空")
    private String nickname;

}
