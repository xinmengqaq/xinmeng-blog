package com.xinmengqaq.springboot.article.dto;

import com.xinmengqaq.springboot.common.page.PageQueryDTO;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
public class PublicArticlePageQueryDTO extends PageQueryDTO {

    @Size(max = 50, message = "关键词不能超过 50 个字符")
    private String keyword;

    @Positive(message = "分类 ID 必须大于 0")
    private Long categoryId;

    private List<@Positive(message = "标签 ID 必须大于 0") Long> tagIds;

    @Min(value = 1970, message = "年份不能早于 1970 年")
    @Max(value = 9999, message = "年份不能超过 9999 年")
    private Integer year;

    @Min(value = 1, message = "月份最小为 1")
    @Max(value = 12, message = "月份最大为 12")
    private Integer month;
}
