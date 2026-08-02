package com.xinmengqaq.springboot.article.service.impl;

import com.xinmengqaq.springboot.article.dto.PublicArticlePageQueryDTO;
import com.xinmengqaq.springboot.article.exception.ArticleLikeRateLimitException;
import com.xinmengqaq.springboot.article.mapper.PublicContentMapper;
import com.xinmengqaq.springboot.article.service.ArticleViewDeduplicator;
import com.xinmengqaq.springboot.article.vo.ArticleArchiveRowVO;
import com.xinmengqaq.springboot.article.vo.HomeVO;
import com.xinmengqaq.springboot.article.vo.PublicArticleDetailVO;
import com.xinmengqaq.springboot.article.vo.PublicArticleListVO;
import com.xinmengqaq.springboot.article.vo.PublicTagVO;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class PublicContentServiceImplTest {

    @Mock
    private PublicContentMapper publicContentMapper;

    @Mock
    private ArticleViewDeduplicator articleViewDeduplicator;

    @InjectMocks
    private PublicContentServiceImpl publicContentService;

    @Test
    @DisplayName("首页按固定数量查询精选和最新文章")
    void testGetHomeUsesFixedLimits() {
        List<PublicArticleListVO> featured = List.of(PublicArticleListVO.builder().id(1L).build());
        List<PublicArticleListVO> latest = List.of(PublicArticleListVO.builder().id(2L).build());
        when(publicContentMapper.selectFeaturedArticles(4)).thenReturn(featured);
        when(publicContentMapper.selectLatestArticles(6)).thenReturn(latest);

        HomeVO result = publicContentService.getHome();

        assertThat(result.getFeaturedArticles()).isSameAs(featured);
        assertThat(result.getLatestArticles()).isSameAs(latest);
    }

    @Test
    @DisplayName("公开文章不存在或不可见时统一返回文章不存在")
    void testGetArticleDetailRejectsMissingArticle() {
        when(publicContentMapper.selectArticleDetail(99L)).thenReturn(null);

        assertThatThrownBy(() -> publicContentService.getArticleDetail(99L, "visitor-hash"))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("文章不存在");
                });
        verifyNoInteractions(articleViewDeduplicator);
        verify(publicContentMapper, never()).incrementViewCount(99L);
    }

    @Test
    @DisplayName("公开文章详情返回标签集合")
    void testGetArticleDetailIncludesTags() {
        PublicArticleDetailVO detail = PublicArticleDetailVO.builder().id(1L).title("公开文章").build();
        List<PublicTagVO> tags = List.of(PublicTagVO.builder().id(3L).name("Java").build());
        when(publicContentMapper.selectArticleDetail(1L)).thenReturn(detail);
        when(publicContentMapper.selectArticleTags(1L)).thenReturn(tags);
        when(articleViewDeduplicator.shouldCount(1L, "visitor-hash")).thenReturn(false);

        PublicArticleDetailVO result = publicContentService.getArticleDetail(1L, "visitor-hash");

        assertThat(result.getTags()).isSameAs(tags);
        verify(publicContentMapper).selectArticleTags(1L);
        verify(publicContentMapper, never()).incrementViewCount(1L);
    }

    @Test
    @DisplayName("首次公开访问在确认文章存在后递增浏览量并返回最新详情")
    void testGetArticleDetailIncrementsViewCountOnlyForFirstVisitor() {
        PublicArticleDetailVO detailBeforeIncrement = PublicArticleDetailVO.builder().id(1L).viewCount(7).build();
        PublicArticleDetailVO detailAfterIncrement = PublicArticleDetailVO.builder().id(1L).viewCount(8).build();
        when(publicContentMapper.selectArticleDetail(1L)).thenReturn(detailBeforeIncrement, detailAfterIncrement);
        when(publicContentMapper.incrementViewCount(1L)).thenReturn(1);
        when(publicContentMapper.selectArticleTags(1L)).thenReturn(List.of());
        when(articleViewDeduplicator.shouldCount(1L, "visitor-hash")).thenReturn(true);

        PublicArticleDetailVO result = publicContentService.getArticleDetail(1L, "visitor-hash");

        assertThat(result).isSameAs(detailAfterIncrement);
        var order = inOrder(publicContentMapper, articleViewDeduplicator);
        order.verify(publicContentMapper).selectArticleDetail(1L);
        order.verify(articleViewDeduplicator).shouldCount(1L, "visitor-hash");
        order.verify(publicContentMapper).incrementViewCount(1L);
        order.verify(publicContentMapper).selectArticleDetail(1L);
        order.verify(publicContentMapper).selectArticleTags(1L);
    }

    @Test
    @DisplayName("同一访客重复访问公开文章时不重复写入浏览量")
    void testGetArticleDetailSkipsViewCountForRepeatedVisitor() {
        PublicArticleDetailVO detail = PublicArticleDetailVO.builder().id(1L).viewCount(8).build();
        when(publicContentMapper.selectArticleDetail(1L)).thenReturn(detail);
        when(publicContentMapper.selectArticleTags(1L)).thenReturn(List.of());
        when(articleViewDeduplicator.shouldCount(1L, "visitor-hash")).thenReturn(false);

        PublicArticleDetailVO result = publicContentService.getArticleDetail(1L, "visitor-hash");

        assertThat(result).isSameAs(detail);
        verify(articleViewDeduplicator).shouldCount(1L, "visitor-hash");
        verify(publicContentMapper, never()).incrementViewCount(1L);
    }

    @Test
    @DisplayName("首次浏览量写入异常时撤销去重标记以允许后续重试")
    void testGetArticleDetailRollsBackDeduplicationWhenViewCountWriteFails() {
        PublicArticleDetailVO detail = PublicArticleDetailVO.builder().id(1L).build();
        when(publicContentMapper.selectArticleDetail(1L)).thenReturn(detail);
        when(articleViewDeduplicator.shouldCount(1L, "visitor-hash")).thenReturn(true);
        when(publicContentMapper.incrementViewCount(1L)).thenThrow(new RuntimeException("数据库异常"));

        assertThatThrownBy(() -> publicContentService.getArticleDetail(1L, "visitor-hash"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("数据库异常");

        verify(articleViewDeduplicator).rollback(1L, "visitor-hash");
    }

    @Test
    @DisplayName("只传月份筛选时返回参数错误")
    void testPageArticlesRequiresYearForMonth() {
        PublicArticlePageQueryDTO queryDTO = new PublicArticlePageQueryDTO();
        queryDTO.setMonth(7);

        assertThatThrownBy(() -> publicContentService.pageArticles(queryDTO))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.PARAM_ERROR.getCode());
                    assertThat(exception.getMessage()).isEqualTo("按月份筛选时必须同时提供年份");
                });
    }

    @Test
    @DisplayName("公开文章分页将多标签去重排序后交给 Mapper")
    void testPageArticlesNormalizesMultipleTagIds() {
        PublicArticlePageQueryDTO queryDTO = new PublicArticlePageQueryDTO();
        queryDTO.setTagIds(List.of(8L, 5L, 8L));
        when(publicContentMapper.selectArticlePage(queryDTO)).thenReturn(List.of());

        publicContentService.pageArticles(queryDTO);

        assertThat(queryDTO.getTagIds()).containsExactly(5L, 8L);
        verify(publicContentMapper).selectArticlePage(queryDTO);
    }

    @Test
    @DisplayName("归档查询按年份组合月份")
    void testGetArticleFilterMetaGroupsMonthsByYear() {
        when(publicContentMapper.selectArchives()).thenReturn(List.of(
                new ArticleArchiveRowVO(2026, 7, 3L),
                new ArticleArchiveRowVO(2026, 6, 2L),
                new ArticleArchiveRowVO(2025, 12, 1L)
        ));

        var result = publicContentService.getArticleFilterMeta();

        assertThat(result.getArchives()).hasSize(2);
        assertThat(result.getArchives().get(0).getYear()).isEqualTo(2026);
        assertThat(result.getArchives().get(0).getMonths()).extracting("month").containsExactly(7, 6);
        assertThat(result.getArchives().get(1).getYear()).isEqualTo(2025);
    }

    @Test
    @DisplayName("匿名点赞写入记录并返回最新点赞数")
    void testLikeArticleReturnsLatestLikeCount() {
        when(publicContentMapper.selectArticleDetail(1L))
                .thenReturn(PublicArticleDetailVO.builder().id(1L).build());
        when(publicContentMapper.countArticleLike(1L, "visitor-hash")).thenReturn(0);
        when(publicContentMapper.countRecentLikesByIpHash(eq("ip-hash"), any())).thenReturn(0L);
        when(publicContentMapper.insertArticleLike(eq(1L), eq("visitor-hash"), eq("ip-hash"), any()))
                .thenReturn(1);
        when(publicContentMapper.incrementLikeCount(1L)).thenReturn(1);
        when(publicContentMapper.selectLikeCount(1L)).thenReturn(7);

        var result = publicContentService.likeArticle(1L, "visitor-hash", "ip-hash");

        assertThat(result.getLikeCount()).isEqualTo(7);
        verify(publicContentMapper).insertArticleLike(eq(1L), eq("visitor-hash"), eq("ip-hash"), any());
    }

    @Test
    @DisplayName("同一访客重复点赞返回冲突")
    void testLikeArticleRejectsDuplicateVisitorLike() {
        when(publicContentMapper.selectArticleDetail(1L))
                .thenReturn(PublicArticleDetailVO.builder().id(1L).build());
        when(publicContentMapper.countArticleLike(1L, "visitor-hash")).thenReturn(1);

        assertThatThrownBy(() -> publicContentService.likeArticle(1L, "visitor-hash", "ip-hash"))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("已经点过赞了");
                });
    }

    @Test
    @DisplayName("点赞超过 IP 时间窗口限制时返回等待秒数")
    void testLikeArticleRejectsRateLimit() {
        when(publicContentMapper.selectArticleDetail(1L))
                .thenReturn(PublicArticleDetailVO.builder().id(1L).build());
        when(publicContentMapper.countArticleLike(1L, "visitor-hash")).thenReturn(0);
        when(publicContentMapper.countRecentLikesByIpHash(eq("ip-hash"), any())).thenReturn(10L);
        when(publicContentMapper.selectOldestRecentLikeAtByIpHash(eq("ip-hash"), any()))
                .thenReturn(java.time.OffsetDateTime.now().minusSeconds(10));

        assertThatThrownBy(() -> publicContentService.likeArticle(1L, "visitor-hash", "ip-hash"))
                .isInstanceOfSatisfying(ArticleLikeRateLimitException.class, exception ->
                        assertThat(exception.getRetryAfterSeconds()).isBetween(1L, 60L));
    }
}
