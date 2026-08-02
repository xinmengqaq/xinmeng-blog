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
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class TagDTOTest {

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
    @DisplayName("新增标签填写名称时参数校验通过")
    void testTagCreateDtoAllowsName() {
        TagCreateDTO dto = new TagCreateDTO();
        dto.setName("生活");

        Set<ConstraintViolation<TagCreateDTO>> violations = validator.validate(dto);

        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("新增标签名称为空或过长时会被参数校验拦住")
    void testTagCreateDtoRejectsBlankAndTooLongName() {
        TagCreateDTO dto = new TagCreateDTO();
        dto.setName("");

        Set<String> blankMessages = validator.validate(dto).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());

        dto.setName("a".repeat(51));
        Set<String> tooLongMessages = validator.validate(dto).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());

        assertThat(blankMessages).contains("标签名称不能为空");
        assertThat(tooLongMessages).contains("标签名称不能超过 50 个字符");
    }

    @Test
    @DisplayName("标签查询关键词不能超过50个字符")
    void testTagQueryDtoRejectsTooLongKeyword() {
        TagQueryDTO dto = new TagQueryDTO();
        dto.setKeyword("a".repeat(51));

        Set<String> messages = validator.validate(dto).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());

        assertThat(messages).contains("标签关键词不能超过 50 个字符");
    }

}
