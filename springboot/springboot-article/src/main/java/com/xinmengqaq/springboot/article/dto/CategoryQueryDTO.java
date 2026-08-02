package com.xinmengqaq.springboot.article.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CategoryQueryDTO {

    @Pattern(regexp = "visible|hidden", message = "分类状态只能是 visible、hidden")
    private String status;

}
