package com.xinmengqaq.springboot.article.mapper;

import com.xinmengqaq.springboot.article.dto.CategoryQueryDTO;
import com.xinmengqaq.springboot.article.entity.Category;
import com.xinmengqaq.springboot.article.vo.CategoryVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CategoryMapper {

    /**
     * 查询所有分类VO
     * @return 所有分类列表
     */
    List<CategoryVO> selectListVO(CategoryQueryDTO queryDTO);


    /**
     * 新增分类
     * @param category 分类实体
     * @return 影响的行数
     */
    int insert(Category category);

    /**
     * 根据分类名查询分类
     * @param name 分类名称
     * @return 分类实体
     */
    Category selectByName(String name);

    /**
     * 根据分类ID查询分类
     * @param id 分类ID
     * @return 分类VO
     */
    Category selectById(Long id);

    /**
     * 根据分类ID查询并锁定分类记录
     * @param id 分类ID
     * @return 分类实体
     */
    Category selectByIdForUpdate(Long id);


    /**
     * 根据分类ID查询分类VO
     * @param id 分类ID
     * @return 分类VO
     */
    CategoryVO selectByIdVO(Long id);

    /**
     * 根据分类ID和分类名查询分类
     * @param id 分类ID
     * @param name 分类名称
     * @return 分类实体
     */
    Category selectExistsByIdAndName(@Param("id") Long id, @Param("name") String name);

    /**
     * 根据分类ID更新分类
     * @param category 分类实体
     * @return 影响的行数
     */
    int updateById(Category category);

    /**
     * 根据分类ID查询分类下的文章数量
     * @param id 分类ID
     * @return 文章数量
     */
    Long countArticleByCategoryId(Long id);

    /**
     * 根据分类ID删除分类
     * @param id 分类ID
     * @return 影响的行数
     */
    int deleteById(Long id);
}
