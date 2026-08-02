package com.xinmengqaq.springboot.article.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.xinmengqaq.springboot.article.entity.Tag;
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
public class TagVO {

    private Long id; // 标签 ID

    private String name; // 标签名称

    private Long articleCount; // 关联文章数量

    private OffsetDateTime createdAt; // 创建时间

    private OffsetDateTime updatedAt; // 更新时间



}