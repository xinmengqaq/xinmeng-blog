package com.xinmengqaq.springboot.article.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;


@Data
public class ArticleRecommendUpdateDTO {

    @NotNull(message = "是否推荐不能为空")
    private Boolean isRecommend;

}