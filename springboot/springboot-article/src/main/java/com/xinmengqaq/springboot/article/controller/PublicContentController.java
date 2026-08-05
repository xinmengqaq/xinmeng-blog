package com.xinmengqaq.springboot.article.controller;

import com.xinmengqaq.springboot.article.dto.PublicArticlePageQueryDTO;
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
import com.xinmengqaq.springboot.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Tag(name = "前台公共内容", description = "前台首页与文章阅读公开接口")
@RestController
@RequestMapping("/api")
public class PublicContentController {

    private static final String VISITOR_COOKIE_NAME = "blog_visitor_id";
    private static final int VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

    @Resource
    private PublicContentService publicContentService;

    /**
     * 查询首页内容
     * @return 首页推荐文章和最新文章
     */
    @Operation(summary = "查询首页内容")
    @GetMapping("/home")
    public Result home() {
        log.info("【Controller】接收到查询首页内容请求");
        HomeVO homeVO = publicContentService.getHome();
        log.info("【Controller】查询首页内容成功, 推荐文章数={}, 最新文章数={}",
                homeVO.getFeaturedArticles().size(), homeVO.getLatestArticles().size());
        return Result.success(homeVO);
    }

    /**
     * 分页查询公开文章
     * @param queryDTO 文章分页查询参数（含分类、标签、年月筛选）
     * @return 分页文章列表
     */
    @Operation(summary = "分页查询公开文章")
    @GetMapping("/articles")
    public Result articles(@Validated @ParameterObject PublicArticlePageQueryDTO queryDTO) {
        log.info("【Controller】接收到分页查询公开文章请求, page={}, size={}, categoryId={}, tagIds={}, year={}, month={}",
                queryDTO.getPage(), queryDTO.getSize(), queryDTO.getCategoryId(), queryDTO.getTagIds(), queryDTO.getYear(), queryDTO.getMonth());
        PageResult<PublicArticleListVO> pageResult = publicContentService.pageArticles(queryDTO);
        log.info("【Controller】分页查询公开文章成功, total={}", pageResult.getTotal());
        return Result.success(pageResult);
    }

    /**
     * 查询文章筛选元数据
     * @return 归档年月列表
     */
    @Operation(summary = "查询文章筛选元数据")
    @GetMapping("/articles/meta")
    public Result articleMeta() {
        log.info("【Controller】接收到查询文章筛选元数据请求");
        ArticleFilterMetaVO metaVO = publicContentService.getArticleFilterMeta();
        log.info("【Controller】查询文章筛选元数据成功, 归档年数={}", metaVO.getArchives().size());
        return Result.success(metaVO);
    }

    /**
     * 查询公开文章详情
     * @param id 文章ID
     * @return 文章详情（含正文和标签）
     */
    @Operation(summary = "查询公开文章详情")
    @GetMapping("/articles/{id}")
    public Result articleDetail(
            @PathVariable Long id,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        log.info("【Controller】接收到查询公开文章详情请求, id={}", id);
        String visitorId = resolveVisitorId(request, response);
        PublicArticleDetailVO detailVO = publicContentService.getArticleDetail(id, sha256(visitorId));
        log.info("【Controller】查询公开文章详情成功, id={}, title={}", id, detailVO.getTitle());
        return Result.success(detailVO);
    }

    /**
     * 查询公开分类列表
     * @return 分类列表（含文章数量）
     */
    @Operation(summary = "查询公开分类")
    @GetMapping("/categories")
    public Result categories() {
        log.info("【Controller】接收到查询公开分类列表请求");
        List<PublicCategoryVO> categoryList = publicContentService.listCategories();
        log.info("【Controller】查询公开分类列表成功, 分类数={}", categoryList.size());
        return Result.success(categoryList);
    }

    /**
     * 查询公开标签列表
     * @return 标签列表（含文章数量）
     */
    @Operation(summary = "查询公开标签")
    @GetMapping("/tags")
    public Result tags() {
        log.info("【Controller】接收到查询公开标签列表请求");
        List<PublicTagVO> tagList = publicContentService.listTags();
        log.info("【Controller】查询公开标签列表成功, 标签数={}", tagList.size());
        return Result.success(tagList);
    }

    @Operation(summary = "匿名点赞文章")
    @PostMapping("/articles/{id}/like")
    public Result likeArticle(
            @PathVariable Long id,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String visitorId = resolveVisitorId(request, response);
        ArticleLikeResultVO result = publicContentService.likeArticle(
                id,
                sha256(visitorId),
                sha256(request.getRemoteAddr())
        );
        return Result.success(result);
    }

    @ExceptionHandler(ArticleLikeRateLimitException.class)
    public ResponseEntity<Result> handleArticleLikeRateLimit(ArticleLikeRateLimitException exception) {
        Result result = Result.error("429", exception.getMessage());
        result.setData(Map.of("retryAfterSeconds", exception.getRetryAfterSeconds()));
        return ResponseEntity.status(429).body(result);
    }

    private String resolveVisitorId(HttpServletRequest request, HttpServletResponse response) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (VISITOR_COOKIE_NAME.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                    return cookie.getValue();
                }
            }
        }

        String visitorId = UUID.randomUUID().toString();
        Cookie cookie = new Cookie(VISITOR_COOKIE_NAME, visitorId);
        cookie.setHttpOnly(true);
        cookie.setSecure(request.isSecure());
        cookie.setPath("/");
        cookie.setMaxAge(VISITOR_COOKIE_MAX_AGE);
        /*
         * 笔记：[SpringMVC] cookie.setAttribute("SameSite", "Lax")
         * Servlet 6+ 的新 API，Cookie 类原来没有 SameSite 属性的 setter，只能用 setAttribute 设键值对。
         * SameSite=Lax 防止 Cookie 在跨站请求中被携带，降低 CSRF 风险：顶层导航会带，子请求（img/script）不带。
         * 三档：Strict（完全不带跨站）、Lax（宽松，顶层导航带）、None（都带，需配合 Secure）。
         */
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
        return visitorId;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("当前 Java 环境不支持 SHA-256", exception);
        }
    }
}
