package com.xinmengqaq.springboot.article.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data

public class ArticleStatusUpdateDTO{

    @NotBlank(message = "文章状态不能为空")
    @Pattern(regexp = "draft|published|hidden", message = "文章状态只能是 draft、published、hidden")
    private String status;

}