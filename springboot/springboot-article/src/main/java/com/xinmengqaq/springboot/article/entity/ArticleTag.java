package com.xinmengqaq.springboot.article.entity;

import lombok.Data;

@Data
public class ArticleTag {

    private Long articleId; // 文章 ID，关联 article.id

    private Long tagId; // 标签 ID，关联 tag.id

}
