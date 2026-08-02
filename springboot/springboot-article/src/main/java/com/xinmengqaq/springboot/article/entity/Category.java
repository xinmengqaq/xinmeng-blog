package com.xinmengqaq.springboot.article.entity;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class Category {

    private Long id; // 分类 ID，主键

    private String name; // 分类名称

    private String description; // 分类描述

    private Integer sortOrder; // 排序值，对应数据库 sort_order

    private String status; // 分类状态：visible 显示、hidden 隐藏

    private OffsetDateTime createdAt; // 创建时间

    private OffsetDateTime updatedAt; // 更新时间

}
