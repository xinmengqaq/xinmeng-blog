package com.xinmengqaq.springboot.article.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TagQueryDTO {

    @Size(max = 50, message = "标签关键词不能超过 50 个字符")
    private String keyword;

}
