package com.xinmengqaq.springboot.article.mapper;

import com.xinmengqaq.springboot.article.dto.ArticlePageQueryDTO;
import com.xinmengqaq.springboot.article.entity.Article;
import com.xinmengqaq.springboot.article.entity.ArticleTag;
import com.xinmengqaq.springboot.article.vo.ArticleDetailVO;
import com.xinmengqaq.springboot.article.vo.ArticleListVO;
import com.xinmengqaq.springboot.article.vo.TagVO;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.github.pagehelper.autoconfigure.PageHelperAutoConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import com.baomidou.mybatisplus.test.autoconfigure.MybatisPlusTest;
import jakarta.annotation.Resource;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.jdbc.Sql;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@MybatisPlusTest(properties = {
        "spring.config.import=optional:file:../springboot-web/src/main/resources/application-local.yml",
        "spring.datasource.url=jdbc:postgresql://localhost:5432/springboot_vue_test?sslmode=disable",
        "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS article_mapper_test; SET search_path TO article_mapper_test",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "mybatis-plus.mapper-locations=classpath*:mapper/**/*.xml",
        "mybatis-plus.configuration.map-underscore-to-camel-case=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ImportAutoConfiguration(PageHelperAutoConfiguration.class)
@MapperScan("com.xinmengqaq.springboot.article.mapper")
@Sql(scripts = {
        "/fixtures/article-relation-test-schema.sql",
        "/fixtures/article-relation-test-data.sql"
})
class ArticleMapperTest {

    @Resource
    private ArticleMapper articleMapper;

    @Resource
    private ArticleTagMapper articleTagMapper;

    @Test
    @DisplayName("新增文章时摘要、封面、分类和发布时间可以为 null")
    void testInsertAndSelectAllowsNullableArticleFields() {
        Article article = article("只有必填字段的文章", null, null, null, "draft", null);

        int rows = articleMapper.insert(article);

        assertThat(rows).isEqualTo(1);
        assertThat(article.getId()).isNotNull();
        Article saved = articleMapper.selectById(article.getId());
        assertThat(saved.getCategoryId()).isNull();
        assertThat(saved.getSummary()).isNull();
        assertThat(saved.getCoverUrl()).isNull();
        assertThat(saved.getStatus()).isEqualTo("draft");
        assertThat(saved.getIsTop()).isFalse();
        assertThat(saved.getIsRecommend()).isFalse();
        assertThat(saved.getPublishedAt()).isNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("修改文章时摘要和封面可以更新为空字符串")
    void testUpdateAllowsClearingSummaryAndCoverUrl() {
        Article source = article("可清空展示字段文章", "原摘要", "/files/origin.png", null, "draft", null);
        articleMapper.insert(source);
        Article update = article("可清空展示字段文章", "", "", null, "draft", null);
        update.setId(source.getId());
        update.setUpdatedAt(OffsetDateTime.parse("2026-07-08T12:00:00+08:00"));

        int rows = articleMapper.updateById(update);

        assertThat(rows).isEqualTo(1);
        Article saved = articleMapper.selectById(source.getId());
        assertThat(saved.getSummary()).isEmpty();
        assertThat(saved.getCoverUrl()).isEmpty();
    }

    @Test
    @DisplayName("分页查询不传关键词和状态时能返回包含空摘要空封面的文章")
    void testSelectPageWorksWhenOptionalQueryFieldsBlank() {
        ArticlePageQueryDTO queryDTO = new ArticlePageQueryDTO();
        queryDTO.setKeyword("");
        queryDTO.setStatus("");

        List<ArticleListVO> articles = articleMapper.selectPage(queryDTO);

        assertThat(articles)
                .extracting(ArticleListVO::getTitle)
                .contains("无摘要草稿", "有摘要发布文章");
        ArticleListVO draft = articles.stream()
                .filter(article -> "无摘要草稿".equals(article.getTitle()))
                .findFirst()
                .orElseThrow();
        assertThat(draft.getSummary()).isNull();
        assertThat(draft.getCoverUrl()).isNull();
    }

    @Test
    @DisplayName("文章列表关键词可以分别匹配标题和摘要")
    void testSelectPageFiltersByKeywordInTitleOrSummary() {
        ArticlePageQueryDTO titleQuery = new ArticlePageQueryDTO();
        titleQuery.setKeyword("无摘要");
        ArticlePageQueryDTO summaryQuery = new ArticlePageQueryDTO();
        summaryQuery.setKeyword("发布摘要");

        List<ArticleListVO> titleMatches = articleMapper.selectPage(titleQuery);
        List<ArticleListVO> summaryMatches = articleMapper.selectPage(summaryQuery);

        assertThat(titleMatches).extracting(ArticleListVO::getId).containsExactly(1L);
        assertThat(summaryMatches).extracting(ArticleListVO::getId).containsExactly(2L);
    }

    @Test
    @DisplayName("文章列表可以按状态筛选")
    void testSelectPageFiltersByStatus() {
        ArticlePageQueryDTO queryDTO = new ArticlePageQueryDTO();
        queryDTO.setStatus("draft");

        List<ArticleListVO> articles = articleMapper.selectPage(queryDTO);

        assertThat(articles).extracting(ArticleListVO::getId).containsExactly(3L, 1L);
        assertThat(articles).allMatch(article -> "draft".equals(article.getStatus()));
    }

    @Test
    @DisplayName("文章列表可以按分类筛选并返回分类名称")
    void testSelectPageFiltersByCategory() {
        ArticlePageQueryDTO queryDTO = new ArticlePageQueryDTO();
        queryDTO.setCategoryId(1L);

        List<ArticleListVO> articles = articleMapper.selectPage(queryDTO);

        assertThat(articles).extracting(ArticleListVO::getId).containsExactly(2L, 4L);
        assertThat(articles).allMatch(article -> "技术".equals(article.getCategoryName()));
    }

    @Test
    @DisplayName("文章列表按标签筛选时文章不重复且分页总数准确")
    void testSelectPageFiltersByTagWithoutDuplicates() {
        ArticlePageQueryDTO queryDTO = new ArticlePageQueryDTO();
        queryDTO.setTagId(2L);
        PageHelper.startPage(1, 1);

        PageInfo<ArticleListVO> pageInfo = new PageInfo<>(articleMapper.selectPage(queryDTO));

        assertThat(pageInfo.getTotal()).isEqualTo(2L);
        assertThat(pageInfo.getList()).extracting(ArticleListVO::getId).containsExactly(2L);
    }

    @Test
    @DisplayName("文章列表可以组合关键词状态分类和标签筛选")
    void testSelectPageCombinesAllFilters() {
        ArticlePageQueryDTO queryDTO = new ArticlePageQueryDTO();
        queryDTO.setKeyword("发布");
        queryDTO.setStatus("published");
        queryDTO.setCategoryId(1L);
        queryDTO.setTagId(2L);

        List<ArticleListVO> articles = articleMapper.selectPage(queryDTO);

        assertThat(articles).extracting(ArticleListVO::getId).containsExactly(2L);
    }

    @Test
    @DisplayName("文章列表按置顶发布时间创建时间和ID稳定排序")
    void testSelectPageUsesStableBusinessOrder() {
        OffsetDateTime publishedAt = OffsetDateTime.parse("2026-07-10T10:00:00+08:00");
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-07-10T09:00:00+08:00");
        Article first = article("同时间发布文章一", null, null, 1L, "published", publishedAt);
        first.setCreatedAt(createdAt);
        first.setUpdatedAt(createdAt);
        Article second = article("同时间发布文章二", null, null, 1L, "published", publishedAt);
        second.setCreatedAt(createdAt);
        second.setUpdatedAt(createdAt);
        Article newestDraft = article("最新创建草稿", null, null, null, "draft", null);
        newestDraft.setCreatedAt(OffsetDateTime.parse("2026-07-11T09:00:00+08:00"));
        newestDraft.setUpdatedAt(newestDraft.getCreatedAt());
        articleMapper.insert(first);
        articleMapper.insert(second);
        articleMapper.insert(newestDraft);

        List<ArticleListVO> articles = articleMapper.selectPage(new ArticlePageQueryDTO());

        assertThat(articles).extracting(ArticleListVO::getId)
                .startsWith(2L, second.getId(), first.getId(), newestDraft.getId());
    }

    @Test
    @DisplayName("文章列表分页返回正确页数据和总数")
    void testSelectPageReturnsRequestedPageAndTotal() {
        PageHelper.startPage(2, 2);

        PageInfo<ArticleListVO> pageInfo = new PageInfo<>(articleMapper.selectPage(new ArticlePageQueryDTO()));

        assertThat(pageInfo.getTotal()).isEqualTo(4L);
        assertThat(pageInfo.getPages()).isEqualTo(2);
        assertThat(pageInfo.getList()).extracting(ArticleListVO::getId).containsExactly(3L, 1L);
    }

    @Test
    @DisplayName("文章详情查询返回正文、分类和标签")
    void testSelectDetailReturnsContentCategoryAndTags() {
        ArticleDetailVO detail = articleMapper.selectDetailById(2L);
        List<TagVO> tags = articleTagMapper.selectTagsByArticleId(2L);

        assertThat(detail.getContent()).isEqualTo("发布正文");
        assertThat(detail.getCategoryId()).isEqualTo(1L);
        assertThat(detail.getCategoryName()).isEqualTo("技术");
        assertThat(tags).extracting(TagVO::getName).containsExactly("MyBatis", "Spring");
    }

    @Test
    @DisplayName("同一篇文章不能重复关联同一标签")
    void testBatchInsertRejectsDuplicateArticleTag() {
        ArticleTag duplicate = new ArticleTag();
        duplicate.setArticleId(2L);
        duplicate.setTagId(1L);

        assertThatThrownBy(() -> articleTagMapper.batchInsert(List.of(duplicate)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("草稿首次发布时写入发布时间并更新时间")
    void testUpdateStatusSetsPublishedAtOnFirstPublish() {
        OffsetDateTime updatedAt = OffsetDateTime.parse("2026-07-11T10:00:00+08:00");

        int rows = articleMapper.updateStatus(1L, "published", updatedAt);

        Article saved = articleMapper.selectById(1L);
        assertThat(rows).isEqualTo(1);
        assertThat(saved.getStatus()).isEqualTo("published");
        assertThat(saved.getPublishedAt()).isEqualTo(updatedAt);
        assertThat(saved.getUpdatedAt()).isEqualTo(updatedAt);
    }

    @Test
    @DisplayName("已发布文章重新发布时保留首次发布时间")
    void testUpdateStatusKeepsFirstPublishedAtWhenRepublished() {
        Article before = articleMapper.selectById(2L);
        OffsetDateTime firstPublishedAt = before.getPublishedAt();
        OffsetDateTime updatedAt = OffsetDateTime.parse("2026-07-11T11:00:00+08:00");

        int rows = articleMapper.updateStatus(2L, "published", updatedAt);

        Article saved = articleMapper.selectById(2L);
        assertThat(rows).isEqualTo(1);
        assertThat(saved.getStatus()).isEqualTo("published");
        assertThat(saved.getPublishedAt()).isEqualTo(firstPublishedAt);
        assertThat(saved.getUpdatedAt()).isEqualTo(updatedAt);
    }

    @Test
    @DisplayName("文章转为草稿或隐藏时保留原发布时间")
    void testUpdateStatusKeepsPublishedAtWhenDraftedOrHidden() {
        OffsetDateTime firstPublishedAt = articleMapper.selectById(2L).getPublishedAt();
        OffsetDateTime draftedAt = OffsetDateTime.parse("2026-07-11T12:00:00+08:00");
        OffsetDateTime hiddenAt = OffsetDateTime.parse("2026-07-11T13:00:00+08:00");

        int draftRows = articleMapper.updateStatus(2L, "draft", draftedAt);
        Article draft = articleMapper.selectById(2L);
        int hiddenRows = articleMapper.updateStatus(2L, "hidden", hiddenAt);
        Article hidden = articleMapper.selectById(2L);

        assertThat(draftRows).isEqualTo(1);
        assertThat(draft.getStatus()).isEqualTo("draft");
        assertThat(draft.getPublishedAt()).isEqualTo(firstPublishedAt);
        assertThat(draft.getUpdatedAt()).isEqualTo(draftedAt);
        assertThat(hiddenRows).isEqualTo(1);
        assertThat(hidden.getStatus()).isEqualTo("hidden");
        assertThat(hidden.getPublishedAt()).isEqualTo(firstPublishedAt);
        assertThat(hidden.getUpdatedAt()).isEqualTo(hiddenAt);
    }

    @Test
    @DisplayName("更新不存在文章的状态时影响行数为零")
    void testUpdateStatusReturnsZeroWhenArticleDoesNotExist() {
        int rows = articleMapper.updateStatus(
                999L,
                "published",
                OffsetDateTime.parse("2026-07-11T14:00:00+08:00")
        );

        assertThat(rows).isZero();
    }

    @Test
    @DisplayName("文章可以设置和取消置顶并更新时间")
    void testUpdateTopCanEnableAndDisableTop() {
        OffsetDateTime enabledAt = OffsetDateTime.parse("2026-07-11T15:00:00+08:00");
        OffsetDateTime disabledAt = OffsetDateTime.parse("2026-07-11T16:00:00+08:00");

        int enabledRows = articleMapper.updateTop(1L, true, enabledAt);
        Article enabled = articleMapper.selectById(1L);
        int disabledRows = articleMapper.updateTop(1L, false, disabledAt);
        Article disabled = articleMapper.selectById(1L);

        assertThat(enabledRows).isEqualTo(1);
        assertThat(enabled.getIsTop()).isTrue();
        assertThat(enabled.getUpdatedAt()).isEqualTo(enabledAt);
        assertThat(disabledRows).isEqualTo(1);
        assertThat(disabled.getIsTop()).isFalse();
        assertThat(disabled.getUpdatedAt()).isEqualTo(disabledAt);
    }

    @Test
    @DisplayName("文章可以设置和取消推荐并更新时间")
    void testUpdateRecommendCanEnableAndDisableRecommend() {
        OffsetDateTime enabledAt = OffsetDateTime.parse("2026-07-11T17:00:00+08:00");
        OffsetDateTime disabledAt = OffsetDateTime.parse("2026-07-11T18:00:00+08:00");

        int enabledRows = articleMapper.updateRecommend(1L, true, enabledAt);
        Article enabled = articleMapper.selectById(1L);
        int disabledRows = articleMapper.updateRecommend(1L, false, disabledAt);
        Article disabled = articleMapper.selectById(1L);

        assertThat(enabledRows).isEqualTo(1);
        assertThat(enabled.getIsRecommend()).isTrue();
        assertThat(enabled.getUpdatedAt()).isEqualTo(enabledAt);
        assertThat(disabledRows).isEqualTo(1);
        assertThat(disabled.getIsRecommend()).isFalse();
        assertThat(disabled.getUpdatedAt()).isEqualTo(disabledAt);
    }

    @Test
    @DisplayName("更新不存在文章的置顶和推荐状态时影响行数为零")
    void testUpdateTopAndRecommendReturnZeroWhenArticleDoesNotExist() {
        OffsetDateTime updatedAt = OffsetDateTime.parse("2026-07-11T19:00:00+08:00");

        int topRows = articleMapper.updateTop(999L, true, updatedAt);
        int recommendRows = articleMapper.updateRecommend(999L, true, updatedAt);

        assertThat(topRows).isZero();
        assertThat(recommendRows).isZero();
    }

    @Test
    @DisplayName("删除文章标签关联后可以删除文章主记录")
    void testDeleteArticleAfterRemovingTagRelations() {
        assertThat(articleTagMapper.selectTagsByArticleId(2L)).hasSize(2);

        int tagRows = articleTagMapper.deleteByArticleId(2L);
        int articleRows = articleMapper.deleteById(2L);

        assertThat(tagRows).isEqualTo(2);
        assertThat(articleRows).isEqualTo(1);
        assertThat(articleTagMapper.selectTagsByArticleId(2L)).isEmpty();
        assertThat(articleMapper.selectById(2L)).isNull();
    }

    @Test
    @DisplayName("批量删除文章时同步清理标签关联并返回实际删除数量")
    void testBatchDeleteArticlesAndTagRelations() {
        List<Long> ids = List.of(1L, 2L, 999L);

        int tagRows = articleTagMapper.deleteByArticleIds(ids);
        int articleRows = articleMapper.deleteByIds(ids);

        assertThat(tagRows).isEqualTo(2);
        assertThat(articleRows).isEqualTo(2);
        assertThat(articleMapper.selectById(1L)).isNull();
        assertThat(articleMapper.selectById(2L)).isNull();
        assertThat(articleTagMapper.selectTagsByArticleId(2L)).isEmpty();
    }

    private Article article(
            String title,
            String summary,
            String coverUrl,
            Long categoryId,
            String status,
            OffsetDateTime publishedAt
    ) {
        OffsetDateTime now = OffsetDateTime.parse("2026-07-08T11:00:00+08:00");
        Article article = new Article();
        article.setCategoryId(categoryId);
        article.setTitle(title);
        article.setSummary(summary);
        article.setContent("测试正文");
        article.setCoverUrl(coverUrl);
        article.setStatus(status);
        article.setIsTop(false);
        article.setIsRecommend(false);
        article.setPublishedAt(publishedAt);
        article.setCreatedAt(now);
        article.setUpdatedAt(now);
        return article;
    }

    @SpringBootConfiguration
    static class TestApplication {
    }
}
