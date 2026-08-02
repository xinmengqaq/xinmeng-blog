package com.xinmengqaq.springboot.article.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.xinmengqaq.springboot.article.entity.Category;
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
public class CategoryVO {

    private Long id; // 分类 ID

    private String name; // 分类名称

    private String description; // 分类描述

    private Integer sortOrder; // 排序值

    private String status; // 分类状态：visible 显示、hidden 隐藏

    private Long articleCount; // 文章数量

    private OffsetDateTime createdAt; // 创建时间

    private OffsetDateTime updatedAt; // 更新时间



}