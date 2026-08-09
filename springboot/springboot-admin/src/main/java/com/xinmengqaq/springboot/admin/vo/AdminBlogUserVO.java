package com.xinmengqaq.springboot.admin.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 管理员视角用户详情 VO，包含完整字段
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