package com.xinmengqaq.springboot.article.mapper;

import com.xinmengqaq.springboot.article.dto.PublicArticlePageQueryDTO;
import com.xinmengqaq.springboot.article.vo.ArticleArchiveRowVO;
import com.xinmengqaq.springboot.article.vo.PublicArticleDetailVO;
import com.xinmengqaq.springboot.article.vo.PublicArticleListVO;
import com.xinmengqaq.springboot.article.vo.PublicCategoryVO;
import com.xinmengqaq.springboot.article.vo.PublicTagVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.time.OffsetDateTime;

@Mapper
public interface PublicContentMapper {

    /**
     * 查询推荐文章列表
     * @param limit 返回数量上限
     * @return 推荐文章视图对象列表
     */
    List<PublicArticleListVO> selectFeaturedArticles(@Param("limit") int limit);

    /**
     * 查询最新文章列表
     * @param limit 返回数量上限
     * @return 最新文章视图对象列表
     */
    List<PublicArticleListVO> selectLatestArticles(@Param("limit") int limit);

    /**
     * 分页查询公开文章，支持分类、标签、年月筛选
     * @param queryDTO 分页查询参数
     * @return 文章视图对象列表
     */
    List<PublicArticleListVO> selectArticlePage(PublicArticlePageQueryDTO queryDTO);

    /**
     * 根据ID查询公开文章详情
     * @param id 文章ID
     * @return 文章详情视图对象
     */
    PublicArticleDetailVO selectArticleDetail(@Param("id") Long id);

    int incrementViewCount(@Param("id") Long id);

    /**
     * 根据文章ID查询关联标签列表
     * @param articleId 文章ID
     * @return 标签视图对象列表
     */
    List<PublicTagVO> selectArticleTags(@Param("articleId") Long articleId);

    /**
     * 查询公开分类列表（含文章数量）
     * @return 分类视图对象列表
     */
    List<PublicCategoryVO> selectCategories();

    /**
     * 查询公开标签列表（含文章数量）
     * @return 标签视图对象列表
     */
    List<PublicTagVO> selectTags();

    /**
     * 查询文章归档数据（按年月分组统计）
     * @return 归档行视图对象列表
     */
    List<ArticleArchiveRowVO> selectArchives();

    int countArticleLike(@Param("articleId") Long articleId, @Param("visitorKeyHash") String visitorKeyHash);

    long countRecentLikesByIpHash(@Param("ipHash") String ipHash, @Param("since") OffsetDateTime since);

    OffsetDateTime selectOldestRecentLikeAtByIpHash(@Param("ipHash") String ipHash, @Param("since") OffsetDateTime since);

    int insertArticleLike(
            @Param("articleId") Long articleId,
            @Param("visitorKeyHash") String visitorKeyHash,
            @Param("ipHash") String ipHash,
            @Param("createdAt") OffsetDateTime createdAt
    );

    int incrementLikeCount(@Param("id") Long id);

    Integer selectLikeCount(@Param("id") Long id);
}
