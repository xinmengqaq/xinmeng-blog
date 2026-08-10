package com.xinmengqaq.springboot.user.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 管理员视角的普通用户公开信息。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
public class AdminBlogUserVO {

    private Long id;

    private String email;

    private String nickname;

    private String avatar;

    private String status;

    private OffsetDateTime deleteAt;

    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;
}
