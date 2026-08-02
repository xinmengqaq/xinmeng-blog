package com.xinmengqaq.springboot.article.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ArticleDTOTest {

    private static ValidatorFactory validatorFactory;

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    @Test
    @DisplayName("新增文章只填写标题和正文时，可选字段可以留空并使用默认值")
    void testArticleDtoAllowsMissingOptionalFieldsAndKeepsDefaults() {
        ArticleDTO dto = new ArticleDTO();
        dto.setTitle("第四阶段测试文章");
        dto.setContent("只填写必填正文。");

        Set<ConstraintViolation<ArticleDTO>> violations = validator.validate(dto);

        assertThat(violations).isEmpty();
        assertThat(dto.getSummary()).isNull();
        assertThat(dto.getCoverUrl()).isNull();
        assertThat(dto.getCategoryId()).isNull();
        assertThat(dto.getTagIds()).isEmpty();
        assertThat(dto.getStatus()).isEqualTo("draft");
        assertThat(dto.getIsTop()).isFalse();
        assertThat(dto.getIsRecommend()).isFalse();
    }

    @Test
    @DisplayName("摘要、封面和标签显式传空值时不触发参数校验错误")
    void testArticleDtoAllowsOptionalTextAndTagIdsBlank() {
        ArticleDTO dto = new ArticleDTO();
        dto.setTitle("可选字段空值测试");
        dto.setSummary("");
        dto.setContent("正文仍然必填。");
        dto.setCoverUrl("");
        dto.setCategoryId(null);
        dto.setTagIds(null);
        dto.setStatus("draft");
        dto.setIsTop(false);
        dto.setIsRecommend(false);

        Set<ConstraintViolation<ArticleDTO>> violations = validator.validate(dto);

        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("摘要和封面长度超出边界时仍会被参数校验拦住")
    void testArticleDtoRejectsTooLongOptionalText() {
        ArticleDTO dto = new ArticleDTO();
        dto.setTitle("可选字段长度测试");
        dto.setSummary("a".repeat(301));
        dto.setContent("正文仍然必填。");
        dto.setCoverUrl("a".repeat(501));
        dto.setTagIds(List.of());

        Set<String> messages = validator.validate(dto).stream()
                .map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.toSet());

        assertThat(messages)
                .contains("文章摘要不能超过 300 个字符", "文章封面地址不能超过 500 个字符");
    }
}
