package com.xinmengqaq.springboot.article.service.impl;

import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.xinmengqaq.springboot.article.dto.PublicArticlePageQueryDTO;
import com.xinmengqaq.springboot.article.exception.ArticleLikeRateLimitException;
import com.xinmengqaq.springboot.article.mapper.PublicContentMapper;
import com.xinmengqaq.springboot.article.service.ArticleViewDeduplicator;
import com.xinmengqaq.springboot.article.service.PublicContentService;
import com.xinmengqaq.springboot.article.vo.ArticleArchiveRowVO;
import com.xinmengqaq.springboot.article.vo.ArticleFilterMetaVO;
import com.xinmengqaq.springboot.article.vo.ArticleLikeResultVO;
import com.xinmengqaq.springboot.article.vo.HomeVO;
import com.xinmengqaq.springboot.article.vo.PublicArticleDetailVO;
import com.xinmengqaq.springboot.article.vo.PublicArticleListVO;
import com.xinmengqaq.springboot.article.vo.PublicCategoryVO;
import com.xinmengqaq.springboot.article.vo.PublicTagVO;
import com.xinmengqaq.springboot.common.PageResult;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DuplicateKeyException;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class PublicContentServiceImpl implements PublicContentService {

    private static final int FEATURED_ARTICLE_LIMIT = 4;
    private static final int LATEST_ARTICLE_LIMIT = 6;
    private static final int LIKE_RATE_LIMIT = 10;
    private static final Duration LIKE_RATE_WINDOW = Duration.ofSeconds(60);

    @Resource
    private PublicContentMapper publicContentMapper;

    @Resource
    private ArticleViewDeduplicator articleViewDeduplicator;

    /**
     * 查询首页内容（推荐文章 + 最新文章）
     * @return 首页视图对象
     */
    @Override
    public HomeVO getHome() {
        log.info("【Service】查询首页内容, 推荐文章限制={}, 最新文章限制={}", FEATURED_ARTICLE_LIMIT, LATEST_ARTICLE_LIMIT);
        HomeVO homeVO = HomeVO.builder()
                .featuredArticles(publicContentMapper.selectFeaturedArticles(FEATURED_ARTICLE_LIMIT))
                .latestArticles(publicContentMapper.selectLatestArticles(LATEST_ARTICLE_LIMIT))
                .build();
        log.info("【Service】查询首页内容完成, 推荐文章数={}, 最新文章数={}", homeVO.getFeaturedArticles().size(), homeVO.getLatestArticles().size());
        return homeVO;
    }

    /**
     * 分页查询公开文章，支持分类、标签、年月筛选
     * @param queryDTO 分页查询参数
     * @return 分页文章结果
     */
    @Override
    public PageResult<PublicArticleListVO> pageArticles(PublicArticlePageQueryDTO queryDTO) {
        log.info("【Service】分页查询公开文章, page={}, size={}, categoryId={}, tagIds={}, year={}, month={}",
                queryDTO.getPage(), queryDTO.getSize(), queryDTO.getCategoryId(), queryDTO.getTagIds(), queryDTO.getYear(), queryDTO.getMonth());
        if (queryDTO.getMonth() != null && queryDTO.getYear() == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "按月份筛选时必须同时提供年份");
        }
        if (queryDTO.getTagIds() != null) {
            queryDTO.setTagIds(queryDTO.getTagIds().stream().distinct().sorted().toList());
        }

        PageHelper.startPage(queryDTO.getPage(), queryDTO.getSize());
        PageResult<PublicArticleListVO> pageResult = PageResult.of(new PageInfo<>(publicContentMapper.selectArticlePage(queryDTO)));
        log.info("【Service】分页查询公开文章完成, total={}", pageResult.getTotal());
        return pageResult;
    }

    /**
     * 查询公开文章详情（含正文和标签）
     * @param id 文章ID
     * @param visitorHash 匿名访客标识的哈希值
     * @return 文章详情视图对象
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public PublicArticleDetailVO getArticleDetail(Long id, String visitorHash) {
        log.info("【Service】查询公开文章详情, id={}", id);
        PublicArticleDetailVO detail = publicContentMapper.selectArticleDetail(id);
        if (detail == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
        }

        boolean shouldCount = articleViewDeduplicator.shouldCount(id, visitorHash);
        try {
            if (shouldCount) {
                if (publicContentMapper.incrementViewCount(id) != 1) {
                    throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
                }
                detail = publicContentMapper.selectArticleDetail(id);
                if (detail == null) {
                    throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
                }
            }
            detail.setTags(publicContentMapper.selectArticleTags(id));
            log.info("【Service】查询公开文章详情完成, id={}, title={}", id, detail.getTitle());
            return detail;
        } catch (RuntimeException exception) {
            if (shouldCount) {
                articleViewDeduplicator.rollback(id, visitorHash);
            }
            throw exception;
        }
    }

    /**
     * 查询公开分类列表（含文章数量）
     * @return 分类视图对象列表
     */
    @Override
    public List<PublicCategoryVO> listCategories() {
        log.info("【Service】查询公开分类列表");
        List<PublicCategoryVO> categoryList = publicContentMapper.selectCategories();
        log.info("【Service】查询公开分类列表完成, 分类数={}", categoryList.size());
        return categoryList;
    }

    /**
     * 查询公开标签列表（含文章数量）
     * @return 标签视图对象列表
     */
    @Override
    public List<PublicTagVO> listTags() {
        log.info("【Service】查询公开标签列表");
        List<PublicTagVO> tagList = publicContentMapper.selectTags();
        log.info("【Service】查询公开标签列表完成, 标签数={}", tagList.size());
        return tagList;
    }

    /**
     * 查询文章筛选元数据（归档年月列表）
     * @return 筛选元数据视图对象
     */
    @Override
    public ArticleFilterMetaVO getArticleFilterMeta() {
        log.info("【Service】查询文章筛选元数据");
        List<ArticleFilterMetaVO.ArchiveYearVO> years = new ArrayList<>();
        for (ArticleArchiveRowVO row : publicContentMapper.selectArchives()) {
            ArticleFilterMetaVO.ArchiveYearVO year = years.isEmpty() ? null : years.getLast();
            if (year == null || !year.getYear().equals(row.getYear())) {
                year = new ArticleFilterMetaVO.ArchiveYearVO(row.getYear(), new ArrayList<>());
                years.add(year);
            }
            year.getMonths().add(new ArticleFilterMetaVO.ArchiveMonthVO(row.getMonth(), row.getArticleCount()));
        }
        ArticleFilterMetaVO metaVO = new ArticleFilterMetaVO(years);
        log.info("【Service】查询文章筛选元数据完成, 归档年数={}", metaVO.getArchives().size());
        return metaVO;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArticleLikeResultVO likeArticle(Long id, String visitorKeyHash, String ipHash) {
        if (publicContentMapper.selectArticleDetail(id) == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
        }
        if (publicContentMapper.countArticleLike(id, visitorKeyHash) > 0) {
            throw new BusinessException(ErrorCode.CONFLICT, "已经点过赞了");
        }

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime since = now.minus(LIKE_RATE_WINDOW);
        if (publicContentMapper.countRecentLikesByIpHash(ipHash, since) >= LIKE_RATE_LIMIT) {
            OffsetDateTime oldestLikeAt = publicContentMapper.selectOldestRecentLikeAtByIpHash(ipHash, since);
            long retryAfterSeconds = oldestLikeAt == null
                    ? LIKE_RATE_WINDOW.toSeconds()
                    : Math.max(1, Duration.between(now, oldestLikeAt.plus(LIKE_RATE_WINDOW)).toSeconds());
            throw new ArticleLikeRateLimitException(retryAfterSeconds);
        }

        /*
         * 笔记：[Spring] DuplicateKeyException
         * Spring 的数据访问异常体系成员，由 Spring 把底层 SQL 唯一键冲突（PG 的 unique violation）统一转换而来。
         * 屏蔽了不同数据库的异常码差异，业务层只需 catch DuplicateKeyException 即可处理"重复插入"场景。
         * 这里并发点赞时数据库唯一索引拦截了重复点赞，Service 先做友好校验再兜底捕获这个异常，双保险。
         */
        try {
            publicContentMapper.insertArticleLike(id, visitorKeyHash, ipHash, now);
        } catch (DuplicateKeyException exception) {
            throw new BusinessException(ErrorCode.CONFLICT, "已经点过赞了");
        }
        if (publicContentMapper.incrementLikeCount(id) != 1) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
        }

        Integer likeCount = publicContentMapper.selectLikeCount(id);
        if (likeCount == null) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "点赞失败");
        }
        return new ArticleLikeResultVO(likeCount);
    }
}
