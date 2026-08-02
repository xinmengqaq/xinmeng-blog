package com.xinmengqaq.springboot.article.dto;

import com.xinmengqaq.springboot.common.page.PageQueryDTO;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;


@Data
@EqualsAndHashCode(callSuper = true)
public class ArticlePageQueryDTO extends PageQueryDTO {

    /*
     * 笔记：[Boot] @EqualsAndHashCode(callSuper = true)
     * Lombok 生成 equals/hashCode 的注解，callSuper=true 表示生成时调用父类的 equals/hashCode 一起参与计算。
     * 子类继承父类时如果不加 callSuper=true，Lombok 只用子类字段生成，父类字段（如 page/size）被忽略，
     * 两个 page/size 不同但 keyword 相同的对象会被判相等，行为错误；Lombok 也会编译警告。
     * 加 callSuper=true 让父类字段一起纳入比较，继承场景下才正确。
     */

    @Size(max = 50, message = "关键词不能超过 50 个字符")
    private String keyword;

    @Pattern(regexp = "draft|published|hidden", message = "文章状态只能是 draft、published、hidden")
    private String status;

    private Long categoryId;

    private Long tagId;


}
