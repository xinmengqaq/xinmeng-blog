package com.xinmengqaq.springboot.article.mapper;

import com.xinmengqaq.springboot.article.dto.TagQueryDTO;
import com.xinmengqaq.springboot.article.entity.Tag;
import com.xinmengqaq.springboot.article.vo.TagVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TagMapper {

    /**
     * 查询标签列表
     * @param queryDTO 标签查询DTO
     * @return 标签列表VO
     */
    List<TagVO> selectList(TagQueryDTO queryDTO);

    /**
     * 新增标签
     * @param tag 标签实体
     * @return 新增结果
     */
    long insert(Tag tag);

    /**
     * 根据标签名查询标签
     * @param name 标签名称
     * @return 标签实体
     */
    Tag selectByName(String name);

    /**
     * 根据标签ID查询标签
     * @param id 标签ID
     * @return 标签实体
     */
    Tag selectById(Long id);

    /**
     * 根据标签ID查询并锁定标签记录
     * @param id 标签ID
     * @return 标签实体
     */
    Tag selectByIdForUpdate(Long id);

    /**
     * 根据标签ID和标签名查询标签
     * @param id 标签ID
     * @param name 标签名称
     * @return 标签实体
     */
    Tag selectExistsByIdAndName(@Param("id") Long id, @Param("name") String name);
    
    /**
     * 根据标签ID更新标签
     * @param tag 标签实体
     * @return 更新结果
     */
    int updateById(Tag tag);

    /**
     * 根据标签ID查询标签VO
     * @param id 标签ID
     * @return 标签VO
     */
    TagVO selectByIdVO(Long id);

    /**
     * 查询标签被多少篇文章使用
     * @param id 标签ID
     * @return 关联文章数量
     */
    Long countArticleByTagId(Long id);

    /**
     * 根据标签ID删除标签
     * @param id 标签ID
     */
    int deleteById(Long id);


    /**
     * 根据标签 ID 列表统计真实存在的标签数量
     * @param ids 标签 ID 列表
     * @return 存在的标签数量
     */
    Long countByIds(@Param("ids") List<Long> ids);
}
