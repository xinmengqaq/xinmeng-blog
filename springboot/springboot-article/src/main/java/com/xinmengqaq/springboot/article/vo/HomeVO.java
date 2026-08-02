package com.xinmengqaq.springboot.article.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HomeVO {

    private List<PublicArticleListVO> featuredArticles;
    private List<PublicArticleListVO> latestArticles;
}
