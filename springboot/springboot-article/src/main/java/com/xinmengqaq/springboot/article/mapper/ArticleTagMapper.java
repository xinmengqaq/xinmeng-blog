package com.xinmengqaq.springboot.article.mapper;

import com.xinmengqaq.springboot.article.entity.ArticleTag;
import com.xinmengqaq.springboot.article.vo.TagVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ArticleTagMapper {

    /**
     * 批量新增文章标签关联
     * @param articleTags 文章标签关联列表
     * @return 影响行数
     */
    int batchInsert(@Param("articleTags") List<ArticleTag> articleTags);

    /**
     * 根据文章 ID 删除旧标签关联
     * @param articleId 文章 ID
     * @return 影响行数
     */
    int deleteByArticleId(@Param("articleId") Long articleId);

    /**
     * 根据文章 ID 列表批量删除标签关联
     * @param articleIds 文章 ID 列表
     * @return 实际删除数量
     */
    int deleteByArticleIds(@Param("articleIds") List<Long> articleIds);

    /**
     * 根据文章 ID 查询文章绑定的标签列表
     * @param articleId 文章 ID
     * @return 标签列表
     */
    List<TagVO> selectTagsByArticleId(@Param("articleId") Long articleId);

}
