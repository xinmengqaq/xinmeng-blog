package com.xinmengqaq.springboot.article.service;

import com.xinmengqaq.springboot.article.dto.TagCreateDTO;
import com.xinmengqaq.springboot.article.dto.TagQueryDTO;
import com.xinmengqaq.springboot.article.dto.TagUpdateDTO;
import com.xinmengqaq.springboot.article.vo.TagVO;

import java.util.List;

public interface TagService {

    /**
     * 查询标签列表
     * @param queryDTO 标签查询DTO
     * @return 标签列表VO
     */
    List<TagVO> list(TagQueryDTO queryDTO);

    /**
     * 新增标签
     * @param createDTO 标签新增DTO
     * @return 新增结果
     */
    Long insert(TagCreateDTO createDTO);

    /**
     * 根据标签ID更新标签
     * @param id 标签ID
     * @param updateDTO 标签更新DTO
     * @return 更新结果
     */
    TagVO updateById(long id, TagUpdateDTO updateDTO);

    /**
     * 根据标签ID删除标签
     * @param id 标签ID
     */
    void deleteById(Long id);
}
