package com.xinmengqaq.springboot.article.service.impl;

import com.xinmengqaq.springboot.article.dto.CategoryCreateDTO;
import com.xinmengqaq.springboot.article.dto.CategoryQueryDTO;
import com.xinmengqaq.springboot.article.dto.CategoryUpdateDTO;
import com.xinmengqaq.springboot.article.entity.Category;
import com.xinmengqaq.springboot.article.mapper.CategoryMapper;
import com.xinmengqaq.springboot.article.service.CategoryService;
import com.xinmengqaq.springboot.article.vo.CategoryVO;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
public class CategoryServiceImpl implements CategoryService {

    @Resource
    private CategoryMapper categoryMapper;

    /**
     * 查询所有分类
     * @return 分类列表VO
     * @param queryDTO 分类查询DTO
     */
    @Override
    public List<CategoryVO> list(CategoryQueryDTO queryDTO) {
        // 记录请求参数日志
        log.info("查询所有分类，查询参数：{}", queryDTO);

        // 执行数据库查询
        List<CategoryVO> categoryVOList = categoryMapper.selectListVO(queryDTO);

        //记录查询结果日志
        log.info("查询所有分类，查询结果：{}", categoryVOList);

        return categoryVOList;

    }

    /**
     * 新增分类
     * @param createDTO 分类创建 DTO
     * @return 影响的分类ID
     */
    @Override
    public Long insert(CategoryCreateDTO createDTO) {
        //记录新增参数日志
        log.info("新增分类，新增参数：{}", createDTO);

        // 先调用 Mapper 按分类名查询是否存在
        Category category = categoryMapper.selectByName(createDTO.getName());

        if (category != null) {
            log.warn("新增分类，分类名已存在，分类名：{}", createDTO.getName());
            throw new BusinessException(ErrorCode.CONFLICT, "分类名已存在");
        }


        // 转换为分类实体
        category = toEntity(createDTO);

        //时间赋值
        category.setCreatedAt(OffsetDateTime.now());
        category.setUpdatedAt(OffsetDateTime.now());

        //调用Mapper新增分类，如果新增失败，抛出异常，否则返回新增的行数
        int rows = categoryMapper.insert(category);
        if(rows != 1 || category.getId() == null) {
            log.error("【Service】新增分类失败，数据库写入异常, name={}", createDTO.getName());
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "新增分类失败");
        }

        return category.getId();
    }

    /**
     * 根据分类ID修改分类
     * @param id 分类ID
     * @param updateDTO 分类更新DTO
     * @return 修改后的分类详情VO
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public CategoryVO updateById(Long id, CategoryUpdateDTO updateDTO) {

        // 判断分类id的分类是否存在
        Category oldCategory = categoryMapper.selectById(id);
        if (oldCategory == null) {
            log.warn("更新分类，分类不存在，分类ID：{}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "分类不存在");
        }

        // 判断分类名是否有相同名
        String trim = updateDTO.getName().trim();
        Category sameNameCategory = categoryMapper.selectExistsByIdAndName(id, trim);
        if (sameNameCategory != null) {
            log.warn("更新分类，分类名已存在，分类名：{}", trim);
            throw new BusinessException(ErrorCode.CONFLICT, "分类名已存在");
        }

        //转换为分类实体
        Category category = toEntity(updateDTO);
        category.setId(id);

        //时间赋值
        category.setUpdatedAt(OffsetDateTime.now());

        //调用Mapper更新分类，如果更新失败，抛出异常，否则返回更新的行数
        int rows = categoryMapper.updateById(category);
        if (rows != 1) {
            log.error("【Service】更新分类失败，数据库写入异常, id={}", id);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "更新分类失败");
        }

        //按id查询返回VO
        CategoryVO categoryVO = categoryMapper.selectByIdVO(id);
        log.info("更新分类数据库操作完成，更新结果：{}", categoryVO);


        return categoryVO;

    }

    /**
     * 根据分类ID删除分类
     * @param id 分类ID
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteById(Long id) {
        // 判断分类id的分类是否存在
        Category category = categoryMapper.selectByIdForUpdate(id);
        if (category == null) {
            log.warn("删除分类，分类不存在，分类ID：{}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "分类不存在");
        }

        // 统计一下分类数量,如果分类下有文章,则不能删除
        Long count = categoryMapper.countArticleByCategoryId(id);
        if (count > 0) {
            log.warn("删除分类，分类下有文章，分类ID：{}", id);
            throw new BusinessException(ErrorCode.CONFLICT, "分类下有文章，不能删除");
        }

        // 调用Mapper删除分类，如果删除失败，抛出异常
        int rows = categoryMapper.deleteById(id);
        if (rows != 1) {
            log.error("【Service】删除分类失败，数据库写入异常, id={}", id);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "删除分类失败");
        }

        log.info("删除分类数据库操作完成，分类ID：{}", id);

    }


    /**
     * 将分类创建DTO 转换为分类实体
     * @param createDTO 分类创建DTO
     * @return 分类实体
     */
    public Category toEntity(CategoryCreateDTO createDTO) {
        Category category = new Category();
        category.setName(createDTO.getName());
        category.setDescription(createDTO.getDescription());
        category.setSortOrder(createDTO.getSortOrder());
        category.setStatus(createDTO.getStatus());
        return category;
    }


}
