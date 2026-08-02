package com.xinmengqaq.springboot.article.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ArticleIdDTO {

    /*
     * 笔记：[Spring] @NotNull
     * JSR-303 非空约束，只拒绝 null，不拒绝空字符串或空集合（那是 @NotBlank/@NotEmpty 的职责）。
     * 适合包装类型（Long/Integer）、布尔值、对象引用这类不能用 @NotBlank 的字段。
     * 这里 Long 类型的文章 ID 只能判 null，不能用 @NotBlank（@NotBlank 只支持字符串）。
     */

    @NotNull(message = "文章ID不能为空")
    private Long id;

}