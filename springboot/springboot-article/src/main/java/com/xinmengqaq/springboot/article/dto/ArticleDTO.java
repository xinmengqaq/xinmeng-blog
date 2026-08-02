package com.xinmengqaq.springboot.article.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;


@Data
public class ArticleDTO {

    @NotBlank(message = "文章标题不能为空")
    @Size(max = 120, message = "文章标题不能超过 120 个字符")
    private String title;

    @Size(max = 300, message = "文章摘要不能超过 300 个字符")
    private String summary;

    @NotBlank(message = "文章正文不能为空")
    private String content;

    @Size(max = 500, message = "文章封面地址不能超过 500 个字符")
    private String coverUrl;

    private Long categoryId;

    private List<Long> tagIds = List.of();

    /*
     * 笔记：[Spring] @Pattern
     * JSR-303 正则约束，regexp 属性指定正则表达式，字段值必须完整匹配整个正则才算通过（部分匹配不行）。
     * 适合枚举值校验：draft|published|hidden 用 | 表示三选一，比手写 if 判断更声明式。
     * null 值视为合法（通过校验），所以枚举字段常配合 @NotNull 使用，或像这里给字段默认值避免 null。
     */
    @Pattern(regexp = "draft|published|hidden", message = "文章状态只能是 draft、published、hidden")
    private String status = "draft";

    private Boolean isTop = false;

    private Boolean isRecommend = false;

}
