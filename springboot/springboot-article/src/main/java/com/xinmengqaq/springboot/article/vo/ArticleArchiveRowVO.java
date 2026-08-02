package com.xinmengqaq.springboot.article.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArticleArchiveRowVO {

    private Integer year;
    private Integer month;
    private Long articleCount;
}
