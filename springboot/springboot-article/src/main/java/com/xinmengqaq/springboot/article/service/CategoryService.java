package com.xinmengqaq.springboot.article.service;

import com.xinmengqaq.springboot.article.dto.CategoryCreateDTO;
import com.xinmengqaq.springboot.article.dto.CategoryQueryDTO;
import com.xinmengqaq.springboot.article.dto.CategoryUpdateDTO;
import com.xinmengqaq.springboot.article.vo.CategoryVO;

import java.util.List;

public interface CategoryService {

    /**
     * 查询所有分类
     * @return 分类列表VO
     */
    List<CategoryVO> list(CategoryQueryDTO queryDTO);

    /**
     * 新增分类
     * @param createDTO 分类创建 DTO
     * @return 影响的行数
     */
    Long insert(CategoryCreateDTO createDTO);

    /**
     * 根据分类ID更新分类
     * @param id 分类ID
     * @param updateDTO 分类更新 DTO
     * @return 更新后的分类VO
     */
    CategoryVO updateById(Long id, CategoryUpdateDTO updateDTO);

    /**
     * 根据分类ID删除分类
     * @param id 分类ID
     */
    void deleteById(Long id);
}
