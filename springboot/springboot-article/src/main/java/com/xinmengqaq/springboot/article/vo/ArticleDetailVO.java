package com.xinmengqaq.springboot.article.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleDetailVO {

    private Long id; // 文章 ID

    private Long categoryId; // 分类 ID

    private String categoryName; // 分类名称

    private String title; // 文章标题

    private String summary; // 文章摘要

    private String content; // 文章正文，Markdown 原文

    private String coverUrl; // 文章封面图片地址

    @Builder.Default
    private List<TagVO> tags = List.of(); // 标签列表

    private String status; // 文章状态：draft、published、hidden

    private Boolean isTop; // 是否置顶

    private Boolean isRecommend; // 是否推荐

    private Integer viewCount; // 阅读数量

    private Integer commentCount; // 评论数量

    private OffsetDateTime publishedAt; // 发布时间

    private OffsetDateTime createdAt; // 创建时间

    private OffsetDateTime updatedAt; // 更新时间


}
