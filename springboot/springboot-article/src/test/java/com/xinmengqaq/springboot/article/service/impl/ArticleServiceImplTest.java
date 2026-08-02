package com.xinmengqaq.springboot.article.service.impl;

import com.xinmengqaq.springboot.article.dto.ArticleDTO;
import com.xinmengqaq.springboot.article.entity.Article;
import com.xinmengqaq.springboot.article.mapper.ArticleMapper;
import com.xinmengqaq.springboot.article.mapper.ArticleTagMapper;
import com.xinmengqaq.springboot.article.mapper.CategoryMapper;
import com.xinmengqaq.springboot.article.mapper.TagMapper;
import com.xinmengqaq.springboot.article.vo.ArticleVO;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.inOrder;

@ExtendWith(MockitoExtension.class)
class ArticleServiceImplTest {

    @Mock
    private ArticleMapper articleMapper;

    @Mock
    private CategoryMapper categoryMapper;

    @Mock
    private TagMapper tagMapper;

    @Mock
    private ArticleTagMapper articleTagMapper;

    @InjectMocks
    private ArticleServiceImpl articleService;

    @Test
    @DisplayName("新增文章省略可选字段时会按草稿默认值保存")
    void testSaveAllowsMissingOptionalFieldsAndUsesDraftDefaults() {
        ArticleDTO dto = new ArticleDTO();
        dto.setTitle("只有必填字段的文章");
        dto.setContent("正文内容。");
        when(articleMapper.insert(any(Article.class))).thenAnswer(invocation -> {
            Article article = invocation.getArgument(0);
            article.setId(10L);
            return 1;
        });

        Long id = articleService.save(dto);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleMapper).insert(captor.capture());
        Article article = captor.getValue();
        assertThat(id).isEqualTo(10L);
        assertThat(article.getCategoryId()).isNull();
        assertThat(article.getSummary()).isNull();
        assertThat(article.getCoverUrl()).isNull();
        assertThat(article.getStatus()).isEqualTo("draft");
        assertThat(article.getIsTop()).isFalse();
        assertThat(article.getIsRecommend()).isFalse();
        assertThat(article.getPublishedAt()).isNull();
        assertThat(article.getCreatedAt()).isNotNull();
        assertThat(article.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("新增已发布文章省略封面和分类时仍会记录发布时间")
    void testSavePublishedArticleAllowsOptionalFieldsBlankAndSetsPublishedAt() {
        ArticleDTO dto = new ArticleDTO();
        dto.setTitle("已发布无封面文章");
        dto.setSummary("");
        dto.setContent("正文内容。");
        dto.setCoverUrl("");
        dto.setCategoryId(null);
        dto.setStatus("published");
        dto.setIsTop(false);
        dto.setIsRecommend(false);
        when(articleMapper.insert(any(Article.class))).thenAnswer(invocation -> {
            Article article = invocation.getArgument(0);
            article.setId(11L);
            return 1;
        });

        Long id = articleService.save(dto);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleMapper).insert(captor.capture());
        Article article = captor.getValue();
        assertThat(id).isEqualTo(11L);
        assertThat(article.getCategoryId()).isNull();
        assertThat(article.getSummary()).isEmpty();
        assertThat(article.getCoverUrl()).isEmpty();
        assertThat(article.getStatus()).isEqualTo("published");
        assertThat(article.getPublishedAt()).isNotNull();
    }

    @Test
    @DisplayName("修改文章时摘要和封面传空字符串可以进入 Mapper 用于清空展示字段")
    void testUpdateAllowsClearingOptionalSummaryAndCover() {
        ArticleDTO dto = new ArticleDTO();
        dto.setTitle("清空可选字段");
        dto.setSummary("");
        dto.setContent("正文内容。");
        dto.setCoverUrl("");
        dto.setCategoryId(null);
        dto.setStatus("draft");
        dto.setIsTop(false);
        dto.setIsRecommend(false);
        Article updated = article(20L, null, "", "", "draft", null);
        when(articleMapper.updateById(any(Article.class))).thenReturn(1);
        when(articleMapper.selectById(20L)).thenReturn(updated);

        ArticleVO result = articleService.updateById(20L, dto);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleMapper).updateById(captor.capture());
        Article article = captor.getValue();
        assertThat(article.getId()).isEqualTo(20L);
        assertThat(article.getCategoryId()).isNull();
        assertThat(article.getSummary()).isEmpty();
        assertThat(article.getCoverUrl()).isEmpty();
        assertThat(article.getUpdatedAt()).isNotNull();
        assertThat(result.getSummary()).isEmpty();
        assertThat(result.getCoverUrl()).isEmpty();
    }

    @Test
    @DisplayName("查询不存在的文章时返回文章不存在")
    void testSelectByIdThrowsWhenArticleMissing() {
        when(articleMapper.selectById(999L)).thenReturn(null);

        assertThatThrownBy(() -> articleService.selectById(999L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("文章不存在");
                });
    }

    @Test
    @DisplayName("新增文章绑定不存在的分类时返回分类不存在")
    void testSaveThrowsWhenCategoryMissing() {
        ArticleDTO dto = new ArticleDTO();
        dto.setTitle("分类不存在的文章");
        dto.setContent("正文内容");
        dto.setCategoryId(999L);
        when(categoryMapper.selectById(999L)).thenReturn(null);

        assertThatThrownBy(() -> articleService.save(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("分类不存在");
                });
    }

    @Test
    @DisplayName("删除文章时先清理标签关联再删除文章主记录")
    void testDeleteRemovesArticleTagsBeforeArticle() {
        when(articleMapper.deleteById(2L)).thenReturn(1);

        articleService.deleteById(2L);

        var inOrder = inOrder(articleTagMapper, articleMapper);
        inOrder.verify(articleTagMapper).deleteByArticleId(2L);
        inOrder.verify(articleMapper).deleteById(2L);
    }

    @Test
    @DisplayName("删除不存在文章时返回文章不存在")
    void testDeleteThrowsWhenArticleMissing() {
        when(articleMapper.deleteById(999L)).thenReturn(0);

        assertThatThrownBy(() -> articleService.deleteById(999L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("文章不存在");
                });

        verify(articleTagMapper).deleteByArticleId(999L);
    }

    @Test
    @DisplayName("批量删除文章时去重并返回实际删除数量")
    void testBatchDeleteDeduplicatesIdsAndReturnsDeletedCount() {
        List<Long> requestedIds = List.of(2L, 2L, 999L);
        List<Long> distinctIds = List.of(2L, 999L);
        when(articleMapper.deleteByIds(distinctIds)).thenReturn(1);

        int deletedCount = articleService.deleteByIds(requestedIds);

        assertThat(deletedCount).isEqualTo(1);
        verify(articleTagMapper).deleteByArticleIds(distinctIds);
        verify(articleMapper).deleteByIds(distinctIds);
    }

    private Article article(Long id, Long categoryId, String summary, String coverUrl, String status, OffsetDateTime publishedAt) {
        OffsetDateTime now = OffsetDateTime.now();
        Article article = new Article();
        article.setId(id);
        article.setCategoryId(categoryId);
        article.setTitle("清空可选字段");
        article.setSummary(summary);
        article.setContent("正文内容。");
        article.setCoverUrl(coverUrl);
        article.setStatus(status);
        article.setIsTop(false);
        article.setIsRecommend(false);
        article.setViewCount(0);
        article.setCommentCount(0);
        article.setPublishedAt(publishedAt);
        article.setCreatedAt(now);
        article.setUpdatedAt(now);
        return article;
    }
}
