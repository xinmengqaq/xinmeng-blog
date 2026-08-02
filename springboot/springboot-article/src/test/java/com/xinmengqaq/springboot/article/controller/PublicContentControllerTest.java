package com.xinmengqaq.springboot.article.controller;

import com.xinmengqaq.springboot.article.exception.ArticleLikeRateLimitException;
import com.xinmengqaq.springboot.article.service.PublicContentService;
import com.xinmengqaq.springboot.article.vo.ArticleFilterMetaVO;
import com.xinmengqaq.springboot.article.vo.ArticleLikeResultVO;
import com.xinmengqaq.springboot.article.vo.HomeVO;
import com.xinmengqaq.springboot.article.vo.PublicArticleDetailVO;
import com.xinmengqaq.springboot.article.vo.PublicArticleListVO;
import com.xinmengqaq.springboot.article.vo.PublicCategoryVO;
import com.xinmengqaq.springboot.article.vo.PublicTagVO;
import com.xinmengqaq.springboot.common.PageResult;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PublicContentControllerTest {

    @Mock
    private PublicContentService publicContentService;

    @InjectMocks
    private PublicContentController publicContentController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(publicContentController).build();
    }

    @Test
    @DisplayName("首页公开接口返回首页内容")
    void testHome() throws Exception {
        when(publicContentService.getHome()).thenReturn(new HomeVO(List.of(), List.of()));

        mockMvc.perform(get("/api/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.featuredArticles").isArray())
                .andExpect(jsonPath("$.data.latestArticles").isArray());
    }

    @Test
    @DisplayName("文章分页公开接口接收组合筛选参数")
    void testArticlePage() throws Exception {
        PageResult<PublicArticleListVO> pageResult = new PageResult<>();
        pageResult.setPage(1);
        pageResult.setSize(10);
        pageResult.setTotal(0L);
        pageResult.setPages(0);
        pageResult.setList(List.of());
        when(publicContentService.pageArticles(any())).thenReturn(pageResult);

        mockMvc.perform(get("/api/articles")
                        .param("page", "1")
                        .param("size", "10")
                        .param("categoryId", "2")
                        .param("tagIds", "5,8")
                        .param("year", "2026")
                        .param("month", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.list").isArray());
    }

    @Test
    @DisplayName("文章详情公开接口返回正文和标签")
    void testArticleDetail() throws Exception {
        PublicArticleDetailVO detail = PublicArticleDetailVO.builder()
                .id(1L)
                .title("公开文章")
                .content("正文")
                .tags(List.of(PublicTagVO.builder().id(2L).name("Java").build()))
                .build();
        when(publicContentService.getArticleDetail(eq(1L), anyString())).thenReturn(detail);

        mockMvc.perform(get("/api/articles/1"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(jsonPath("$.data.title").value("公开文章"))
                .andExpect(jsonPath("$.data.tags[0].name").value("Java"));
    }

    @Test
    @DisplayName("文章详情复用现有访客 Cookie 并仅向服务传递访客哈希")
    void testArticleDetailReusesVisitorCookieAndPassesHash() throws Exception {
        PublicArticleDetailVO detail = PublicArticleDetailVO.builder().id(1L).title("公开文章").build();
        when(publicContentService.getArticleDetail(eq(1L), anyString())).thenReturn(detail);

        mockMvc.perform(get("/api/articles/1")
                        .cookie(new Cookie("blog_visitor_id", "known-visitor")))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Set-Cookie"));

        ArgumentCaptor<String> visitorHashCaptor = ArgumentCaptor.forClass(String.class);
        verify(publicContentService).getArticleDetail(eq(1L), visitorHashCaptor.capture());
        assertThat(visitorHashCaptor.getValue())
                .isNotEqualTo("known-visitor")
                .hasSize(64);
    }

    @Test
    @DisplayName("分类标签和归档使用独立公开路径")
    void testPublicLookupRoutes() throws Exception {
        when(publicContentService.listCategories())
                .thenReturn(List.of(PublicCategoryVO.builder().id(1L).name("日常").articleCount(2L).build()));
        when(publicContentService.listTags())
                .thenReturn(List.of(PublicTagVO.builder().id(2L).name("Java").articleCount(1L).build()));
        when(publicContentService.getArticleFilterMeta()).thenReturn(new ArticleFilterMetaVO(List.of()));

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].articleCount").value(2));
        mockMvc.perform(get("/api/tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("Java"));
        mockMvc.perform(get("/api/articles/meta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.archives").isArray());
    }

    @Test
    @DisplayName("匿名点赞接口下发访客 Cookie 并返回最新点赞数")
    void testLikeArticleCreatesVisitorCookie() throws Exception {
        when(publicContentService.likeArticle(anyLong(), anyString(), anyString()))
                .thenReturn(new ArticleLikeResultVO(7));

        mockMvc.perform(post("/api/articles/1/like"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.likeCount").value(7));
    }

    @Test
    @DisplayName("匿名点赞限频响应包含等待秒数")
    void testLikeArticleRateLimitReturnsRetryAfterSeconds() throws Exception {
        when(publicContentService.likeArticle(anyLong(), anyString(), anyString()))
                .thenThrow(new ArticleLikeRateLimitException(30));

        mockMvc.perform(post("/api/articles/1/like"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("429"))
                .andExpect(jsonPath("$.data.retryAfterSeconds").value(30));
    }
}
