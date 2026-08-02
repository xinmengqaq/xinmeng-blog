package com.xinmengqaq.springboot.article.mapper;

import com.xinmengqaq.springboot.article.dto.ArticlePageQueryDTO;
import com.xinmengqaq.springboot.article.entity.Article;
import com.xinmengqaq.springboot.article.vo.ArticleDetailVO;
import com.xinmengqaq.springboot.article.vo.ArticleListVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.OffsetDateTime;
import java.util.List;

@Mapper
public interface ArticleMapper {

    /*
     * 笔记：[MyBatis] @Mapper
     * MyBatis 单接口标记注解，标记当前接口为 Mapper，Spring 会为其生成代理实现类并注册为 Bean。
     * 和 @MapperScan 两种方式：@MapperScan 在启动类批量扫描整个包，@Mapper 单个接口标记。
     * 本项目启动类已用 @MapperScan 统一扫描，这里加 @Mapper 是冗余的（不影响功能），二选一即可。
     */

    /**
     * 根据 ID 查询文章详情
     * @param id 文章 ID
     * @return 文章详情
     */
    Article selectById(Long id);

    /**
     * 新增文章
     * @param article 文章实体
     * @return 影响行数
     */
    int insert(Article article);

    /**
     * 根据 ID 更新文章
     * @param article 文章实体
     * @return 影响行数
     */
    int updateById(Article article);

    /**
     * 根据 ID 删除文章
     * @param id 文章 ID
     * @return 影响行数
     */
    int deleteById(Long id);

    /**
     * 根据 ID 列表批量删除文章
     * @param ids 文章 ID 列表
     * @return 实际删除数量
     */
    int deleteByIds(@Param("ids") List<Long> ids);

    List<ArticleListVO> selectPage(ArticlePageQueryDTO queryDTO);

    /**
     * 根据文章 ID 查询文章详情，带分类名称
     * @param id 文章 ID
     * @return 文章详情
     */
    ArticleDetailVO selectDetailById(Long id);

    /**
     * 更新文章状态
     * @param id 文章 ID
     * @param status 文章状态：draft、published、hidden
     * @param updatedAt 更新时间
     * @return 影响行数
     */
    int updateStatus(
            @Param("id") Long id,
            @Param("status") String status,
            @Param("updatedAt") OffsetDateTime updatedAt
    );

    /**
     * 更新文章置顶状态
     * @param id 文章 ID
     * @param isTop 是否置顶
     * @param updatedAt 更新时间
     * @return 影响行数
     */
    int updateTop(@Param("id") Long id,
                  @Param("isTop") Boolean isTop,
                  @Param("updatedAt") OffsetDateTime updatedAt);



    /**
     * 更新文章推荐状态
     * @param id 文章 ID
     * @param isRecommend 是否推荐
     * @param updatedAt 更新时间
     * @return 影响行数
     */
    int updateRecommend(@Param("id") Long id,
                       @Param("isRecommend") Boolean isRecommend,
                       @Param("updatedAt") OffsetDateTime updatedAt);
}
