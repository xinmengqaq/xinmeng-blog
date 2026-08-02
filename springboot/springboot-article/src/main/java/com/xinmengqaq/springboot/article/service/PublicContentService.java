package com.xinmengqaq.springboot.article.service;

import com.xinmengqaq.springboot.article.dto.PublicArticlePageQueryDTO;
import com.xinmengqaq.springboot.article.vo.ArticleFilterMetaVO;
import com.xinmengqaq.springboot.article.vo.ArticleLikeResultVO;
import com.xinmengqaq.springboot.article.vo.HomeVO;
import com.xinmengqaq.springboot.article.vo.PublicArticleDetailVO;
import com.xinmengqaq.springboot.article.vo.PublicArticleListVO;
import com.xinmengqaq.springboot.article.vo.PublicCategoryVO;
import com.xinmengqaq.springboot.article.vo.PublicTagVO;
import com.xinmengqaq.springboot.common.PageResult;

import java.util.List;

public interface PublicContentService {

    /**
     * 查询首页内容（推荐文章 + 最新文章）
     * @return 首页视图对象
     */
    HomeVO getHome();

    /**
     * 分页查询公开文章，支持分类、标签、年月筛选
     * @param queryDTO 分页查询参数
     * @return 分页文章结果
     */
    PageResult<PublicArticleListVO> pageArticles(PublicArticlePageQueryDTO queryDTO);

    /**
     * 查询公开文章详情（含正文和标签）
     * @param id 文章ID
     * @param visitorHash 匿名访客标识的哈希值
     * @return 文章详情视图对象
     */
    PublicArticleDetailVO getArticleDetail(Long id, String visitorHash);

    /**
     * 查询公开分类列表（含文章数量）
     * @return 分类视图对象列表
     */
    List<PublicCategoryVO> listCategories();

    /**
     * 查询公开标签列表（含文章数量）
     * @return 标签视图对象列表
     */
    List<PublicTagVO> listTags();

    /**
     * 查询文章筛选元数据（归档年月列表）
     * @return 筛选元数据视图对象
     */
    ArticleFilterMetaVO getArticleFilterMeta();

    ArticleLikeResultVO likeArticle(Long id, String visitorKeyHash, String ipHash);
}
