package com.xinmengqaq.springboot.article.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicCategoryVO {

    private Long id;
    private String name;
    private Long articleCount;
}
