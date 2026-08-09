package com.xinmengqaq.springboot.user.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import lombok.Builder;
import lombok.Data;

/**
 * 用户资料返回 VO，登录成功时额外携带 token
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
public class BlogUserVO {

    private Long id;

    private String email;

    private String nickname;

    private String avatar;

    private String token;

    public static BlogUserVO from(BlogUser user) {
        return BlogUserVO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .build();
    }

}