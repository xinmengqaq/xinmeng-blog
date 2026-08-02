package com.xinmengqaq.springboot.article.entity;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class Tag {

    private Long id; // 标签 ID，主键

    private String name; // 标签名称

    private OffsetDateTime createdAt; // 创建时间

    private OffsetDateTime updatedAt; // 更新时间

}
