package com.xinmengqaq.springboot.article.service.impl;

import com.xinmengqaq.springboot.article.dto.ArticleDTO;
import com.xinmengqaq.springboot.article.service.ArticleService;
import com.xinmengqaq.springboot.article.vo.ArticleDetailVO;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.annotation.MapperScan;
import com.baomidou.mybatisplus.test.autoconfigure.MybatisPlusTest;
import jakarta.annotation.Resource;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@MybatisPlusTest(properties = {
        "spring.config.import=optional:file:../springboot-web/src/main/resources/application-local.yml",
        "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS article_relation_test; SET search_path TO article_relation_test",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "mybatis-plus.mapper-locations=classpath*:mapper/**/*.xml",
        "mybatis-plus.configuration.map-underscore-to-camel-case=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@MapperScan("com.xinmengqaq.springboot.article.mapper")
@Import(ArticleServiceImpl.class)
@Sql(scripts = {
        "/fixtures/article-relation-test-schema.sql",
        "/fixtures/article-relation-test-data.sql"
})
class ArticleRelationIntegrationTest {

    @Resource
    private ArticleService articleService;

    @Test
    @DisplayName("文章标签ID重复时拒绝修改")
    void testUpdateRejectsDuplicateTagIds() {
        ArticleDTO dto = articleDTO(1L, List.of(1L, 1L));

        assertThatThrownBy(() -> articleService.updateById(2L, dto))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.PARAM_ERROR.getCode());
                    assertThat(exception.getMessage()).isEqualTo("标签ID不能重复");
                });
    }

    @Test
    @DisplayName("修改文章后分类和标签关联与详情查询结果一致")
    void testUpdateSynchronizesCategoryAndTagsWithDetail() {
        ArticleDTO update = articleDTO(2L, List.of(3L));

        articleService.updateById(2L, update);
        ArticleDetailVO updated = articleService.selectDetailById(2L);

        assertThat(updated.getCategoryId()).isEqualTo(2L);
        assertThat(updated.getCategoryName()).isEqualTo("生活");
        assertThat(updated.getTags()).extracting(tag -> tag.getId()).containsExactly(3L);

        ArticleDTO clearRelations = articleDTO(null, null);
        articleService.updateById(2L, clearRelations);
        ArticleDetailVO cleared = articleService.selectDetailById(2L);

        assertThat(cleared.getCategoryId()).isNull();
        assertThat(cleared.getCategoryName()).isNull();
        assertThat(cleared.getTags()).isEmpty();
    }

    private ArticleDTO articleDTO(Long categoryId, List<Long> tagIds) {
        ArticleDTO dto = new ArticleDTO();
        dto.setTitle("修改后的文章");
        dto.setSummary("修改后的摘要");
        dto.setContent("修改后的正文");
        dto.setCoverUrl("/files/updated.png");
        dto.setCategoryId(categoryId);
        dto.setTagIds(tagIds);
        dto.setStatus("published");
        dto.setIsTop(false);
        dto.setIsRecommend(true);
        return dto;
    }

    @SpringBootConfiguration
    static class TestApplication {
    }
}
