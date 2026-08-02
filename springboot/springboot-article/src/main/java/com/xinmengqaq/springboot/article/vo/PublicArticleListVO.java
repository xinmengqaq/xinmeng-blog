package com.xinmengqaq.springboot.article.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
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
public class PublicArticleListVO {

    private Long id;
    private String title;
    private String summary;
    private String coverUrl;
    private Long categoryId;
    private String categoryName;
    private Boolean isTop;
    private Boolean isRecommend;
    private Integer viewCount;
    private Integer commentCount;
    private Integer likeCount;
    private OffsetDateTime publishedAt;
}
