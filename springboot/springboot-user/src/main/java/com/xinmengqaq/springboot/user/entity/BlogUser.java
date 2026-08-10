package com.xinmengqaq.springboot.user.entity;

import com.baomidou.mybatisplus.annotation.Version;
import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 博客用户实体，对应 blog_user 表
 */
@Data
public class BlogUser {

    private Long id;

    private String email;

    private String password;

    private String nickname;

    private String avatar;

    private String status;

    private Integer passwordVersion;

    @Version
    private Integer version;

    private OffsetDateTime deleteAt;

    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;

}
