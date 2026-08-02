package com.xinmengqaq.springboot.article.entity;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class Article {

    private Long id; // 文章 ID，主键

    private Long categoryId; // 分类 ID，第四阶段可为空，第五阶段再关联分类表

    private String title; // 文章标题

    private String summary; // 文章摘要

    private String content; // 文章正文，存储 Markdown 原文

    private String coverUrl; // 文章封面图片地址

    private String status; // 文章状态：draft 草稿、published 已发布、hidden 隐藏

    private Boolean isTop; // 是否置顶，对应数据库 is_top

    private Boolean isRecommend; // 是否推荐，对应数据库 is_recommend

    private Integer viewCount; // 阅读数量

    private Integer commentCount; // 评论数量

    private OffsetDateTime publishedAt; // 发布时间，草稿时为空

    private OffsetDateTime createdAt; // 创建时间

    private OffsetDateTime updatedAt; // 更新时间
}
