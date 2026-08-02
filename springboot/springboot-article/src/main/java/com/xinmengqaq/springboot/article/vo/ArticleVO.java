package com.xinmengqaq.springboot.article.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.xinmengqaq.springboot.article.entity.Article;
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
public class ArticleVO {

    private Long id; // 文章 ID

    private Long categoryId; // 分类 ID，第四阶段通常为空

    private String title; // 文章标题

    private String summary; // 文章摘要

    private String content; // 文章正文，Markdown 原文

    private String coverUrl; // 文章封面图片地址

    private String status; // 文章状态：draft、published、hidden

    private Boolean isTop; // 是否置顶

    private Boolean isRecommend; // 是否推荐

    private Integer viewCount; // 阅读数量

    private Integer commentCount; // 评论数量

    private OffsetDateTime publishedAt; // 发布时间

    private OffsetDateTime createdAt; // 创建时间

    private OffsetDateTime updatedAt; // 更新时间

    public static ArticleVO fromArticle(Article article) {
        return ArticleVO.builder()
                .id(article.getId())
                .categoryId(article.getCategoryId())
                .title(article.getTitle())
                .summary(article.getSummary())
                .content(article.getContent())
                .coverUrl(article.getCoverUrl())
                .status(article.getStatus())
                .isTop(article.getIsTop())
                .isRecommend(article.getIsRecommend())
                .viewCount(article.getViewCount())
                .commentCount(article.getCommentCount())
                .publishedAt(article.getPublishedAt())
                .createdAt(article.getCreatedAt())
                .updatedAt(article.getUpdatedAt())
                .build();
    }
}