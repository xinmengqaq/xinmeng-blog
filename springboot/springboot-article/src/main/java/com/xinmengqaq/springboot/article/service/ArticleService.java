package com.xinmengqaq.springboot.article.service;

import com.xinmengqaq.springboot.article.dto.ArticleDTO;
import com.xinmengqaq.springboot.article.dto.ArticlePageQueryDTO;
import com.xinmengqaq.springboot.article.vo.ArticleDetailVO;
import com.xinmengqaq.springboot.article.vo.ArticleListVO;
import com.xinmengqaq.springboot.article.vo.ArticleVO;
import com.xinmengqaq.springboot.common.PageResult;

import java.util.List;

public interface ArticleService {



    /**
     * 新增文章
     * @param articleDTO 文章保存DTO
     * @return 新增的文章ID
     */
     Long save(ArticleDTO articleDTO);

     /**
      * 根据文章ID更新文章
      * @param id 文章ID
      * @param articleDTO 文章保存DTO
      */
     ArticleVO updateById(Long id, ArticleDTO articleDTO);

     /**
      * 根据文章ID删除文章
      * @param id 文章ID
      */
     void deleteById(Long id);

    /**
     * 批量删除文章
     * @param ids 文章 ID 列表
     * @return 实际删除数量
     */
    int deleteByIds(List<Long> ids);

    PageResult<ArticleListVO> selectPage(ArticlePageQueryDTO queryDTO);

    /**
     * 根据文章 ID 查询文章详情，包含分类和标签
     * @param id 文章 ID
     * @return 文章详情
     */
    ArticleDetailVO selectDetailById(Long id);

    /**
     * 更新文章状态
     * @param id 文章 ID
     * @param status 文章状态：draft、published、hidden
     */
     void updateStatus(Long id, String status);

     /**
      * 更新文章置顶状态
      * @param id 文章 ID
      * @param isTop 是否置顶
      */
    void updateTop(Long id, Boolean isTop);

     /**
      * 更新文章推荐状态
      * @param id 文章 ID
      * @param isRecommend 是否推荐
      */
    void updateRecommend(Long id, Boolean isRecommend);
}
