package com.xinmengqaq.springboot.article.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleListVO {

    private Long id; // 文章 ID

    private Long categoryId; // 分类 ID

    private String categoryName; // 分类名称

    private String title; // 文章标题

    private String summary; // 文章摘要

    private String coverUrl; // 文章封面图片地址

    private String status; // 文章状态：draft、published、hidden

    private Boolean isTop; // 是否置顶

    private Boolean isRecommend; // 是否推荐

    private Integer viewCount; // 阅读数量

    private Integer commentCount; // 评论数量

    private OffsetDateTime publishedAt; // 发布时间

    private OffsetDateTime createdAt; // 创建时间

    private OffsetDateTime updatedAt; // 更新时间



}
