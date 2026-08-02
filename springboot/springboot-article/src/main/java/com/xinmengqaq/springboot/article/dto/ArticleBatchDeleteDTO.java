package com.xinmengqaq.springboot.article.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.List;

@Data
public class ArticleBatchDeleteDTO {

    /*
     * 笔记：[Spring] @NotEmpty
     * JSR-303 集合非空约束，拒绝 null 和空集合（size 为 0），但允许集合内的元素为 null。
     * 和 @NotBlank 区别：@NotBlank 用于字符串，@NotEmpty 用于集合/数组/Map；@NotNull 只拒 null 不拒空。
     * 这里保证 ids 列表至少有一个元素，但元素本身是否合法要靠下面的元素级校验。
     */

    /*
     * 笔记：[Spring] List<@NotNull @Positive> 元素级校验
     * Bean Validation 2.0 支持把约束注解写在泛型类型参数上，校验集合里的每一个元素而非集合本身。
     * 这里 @NotNull 校验每个 Long 元素不为 null，@Positive 校验每个元素 > 0，任一元素违规都会抛 ConstraintViolationException。
     * 不写在类型参数上则只校验集合非空，元素本身不会被校验，是常见遗漏点。
     */

    @NotEmpty(message = "文章ID列表不能为空")
    private List<@NotNull(message = "文章ID不能为空") @Positive(message = "文章ID必须大于0") Long> ids;

}
