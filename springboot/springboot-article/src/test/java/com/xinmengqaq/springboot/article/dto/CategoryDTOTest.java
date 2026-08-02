package com.xinmengqaq.springboot.article.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CategoryDTOTest {

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
    @DisplayName("新增分类只填写名称时可使用默认排序和显示状态")
    void testCategoryCreateDtoAllowsNameOnlyAndKeepsDefaults() {
        CategoryCreateDTO dto = new CategoryCreateDTO();
        dto.setName("Java");

        Set<ConstraintViolation<CategoryCreateDTO>> violations = validator.validate(dto);

        assertThat(violations).isEmpty();
        assertThat(dto.getDescription()).isNull();
        assertThat(dto.getSortOrder()).isZero();
        assertThat(dto.getStatus()).isEqualTo("visible");
    }

    @Test
    @DisplayName("新增分类名称为空或状态非法时会被参数校验拦住")
    void testCategoryCreateDtoRejectsBlankNameAndInvalidStatus() {
        CategoryCreateDTO dto = new CategoryCreateDTO();
        dto.setName("");
        dto.setStatus("deleted");

        Set<String> messages = validator.validate(dto).stream()
                .map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.toSet());

        assertThat(messages)
                .contains("分类名称不能为空", "分类状态只能是 visible、hidden");
    }

    @Test
    @DisplayName("分类查询状态只能是 visible 或 hidden")
    void testCategoryQueryDtoRejectsInvalidStatus() {
        CategoryQueryDTO dto = new CategoryQueryDTO();
        dto.setStatus("draft");

        Set<String> messages = validator.validate(dto).stream()
                .map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.toSet());

        assertThat(messages).contains("分类状态只能是 visible、hidden");
    }
}
