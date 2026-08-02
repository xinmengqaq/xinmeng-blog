package com.xinmengqaq.springboot.article.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;


@Data
public class ArticleTopUpdateDTO  {

    @NotNull(message = "是否置顶不能为空")
    private Boolean isTop;

}