package com.xinmengqaq.springboot.article.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CategoryCreateDTO {

    @NotBlank(message = "分类名称不能为空")
    @Size(max = 50, message = "分类名称不能超过 50 个字符")
    private String name;

    @Size(max = 200, message = "分类描述不能超过 200 个字符")
    private String description;

    private Integer sortOrder = 0;

    @Pattern(regexp = "visible|hidden", message = "分类状态只能是 visible、hidden")
    private String status = "visible";

}
