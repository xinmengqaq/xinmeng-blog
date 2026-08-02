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

class ArticleBatchDeleteDTOTest {

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
    @DisplayName("批量删除文章ID列表不能为空")
    void testRejectsEmptyIds() {
        ArticleBatchDeleteDTO dto = new ArticleBatchDeleteDTO();
        dto.setIds(List.of());

        assertThat(messages(dto)).contains("文章ID列表不能为空");
    }

    @Test
    @DisplayName("批量删除文章ID必须非空且大于零")
    void testRejectsInvalidIds() {
        ArticleBatchDeleteDTO dto = new ArticleBatchDeleteDTO();
        dto.setIds(java.util.Arrays.asList(null, 0L, -1L));

        assertThat(messages(dto)).contains("文章ID不能为空", "文章ID必须大于0");
    }

    private Set<String> messages(ArticleBatchDeleteDTO dto) {
        return validator.validate(dto).stream()
                .map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.toSet());
    }
}
