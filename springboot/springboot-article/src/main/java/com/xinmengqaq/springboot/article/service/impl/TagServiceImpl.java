package com.xinmengqaq.springboot.article.service.impl;

import com.xinmengqaq.springboot.article.dto.TagCreateDTO;
import com.xinmengqaq.springboot.article.dto.TagQueryDTO;
import com.xinmengqaq.springboot.article.dto.TagUpdateDTO;
import com.xinmengqaq.springboot.article.entity.Tag;
import com.xinmengqaq.springboot.article.mapper.TagMapper;
import com.xinmengqaq.springboot.article.service.TagService;
import com.xinmengqaq.springboot.article.vo.TagVO;
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
public class TagServiceImpl implements TagService {

    @Resource
    private TagMapper tagMapper;

    /**
     * 查询标签列表
     * @param queryDTO 标签查询DTO
     * @return 标签列表VO
     */
    @Override
    public List<TagVO> list(TagQueryDTO queryDTO) {
        log.info("【Service】接收到查询标签列表请求, keyword={}", queryDTO.getKeyword());

        return tagMapper.selectList(queryDTO);
    }

    /**
     * 新增标签
     * @param updateDTO 标签更新DTO
     * @return 新增结果
     */
    @Override
    public Long insert(TagCreateDTO createDTO) {
        log.info("【Service】接收到新增标签请求, name={}", createDTO.getName());

        //判断是否有同名标签,先去除空格
        String tagName = createDTO.getName().trim();
        Tag tagExistName = tagMapper.selectByName(tagName);
        if (tagExistName != null) {
            log.warn("新增标签，标签名已存在，标签名：{}", tagName);
            throw new BusinessException(ErrorCode.CONFLICT, "标签名已存在");
        }

        Tag tag = new Tag();
        tag.setName(tagName);
        tag.setCreatedAt(OffsetDateTime.now());
        tag.setUpdatedAt(OffsetDateTime.now());

        long rows = tagMapper.insert(tag);
        if (rows != 1) {
            log.error("【Service】新增标签失败，数据库写入异常, tagName={}", tagName);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "新增标签失败");
        }

        return tag.getId();

    }

    /**
     * 根据标签ID更新标签
     * @param id 标签ID
     * @param updateDTO 标签更新DTO
     * @return 更新结果
    */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public TagVO updateById(long id, TagUpdateDTO updateDTO) {
        log.info("【Service】接收到更新标签请求, id={}, name={}", id, updateDTO.getName());

        //先查id是否存在
        Tag oldTagId = tagMapper.selectById(id);
        if (oldTagId == null) {
            log.warn("更新标签，标签不存在，标签ID：{}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "标签不存在");
        }

        //判断是否有同名标签,先去除空格
        String tagName = updateDTO.getName().trim();
        Tag tagExistName = tagMapper.selectExistsByIdAndName(id, tagName);
        if (tagExistName != null) {
            log.warn("更新标签，标签名已存在，标签名：{}", tagName);
            throw new BusinessException(ErrorCode.CONFLICT, "标签名已存在");
        }

        //转换
        Tag tag = new Tag();
        tag.setId(id);
        tag.setName(tagName);
        tag.setUpdatedAt(OffsetDateTime.now());

        //更新标签
        int rows = tagMapper.updateById(tag);
        if (rows != 1) {
            log.error("【Service】更新标签失败，数据库写入异常, id={}", id);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "更新标签失败");
        }

        log.info("【Service】更新标签数据库操作完成，标签ID：{}", id);

        return tagMapper.selectByIdVO(id);

    }


    /**
     * 根据标签ID删除标签
     * @param id 标签ID
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteById(Long id) {

        log.info("【Service】接收到删除标签请求, id={}", id);

        // 锁定并确认标签存在，避免占用校验期间产生新的关联写入
        Tag oldTagId = tagMapper.selectByIdForUpdate(id);
        if (oldTagId == null) {
            log.warn("删除标签，标签不存在，标签ID：{}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "标签不存在");
        }

        //检查该id是否有文章引用
        Long articleCount = tagMapper.countArticleByTagId(id);
        if (articleCount > 0) {
            log.warn("删除标签，标签已被文章引用，标签ID：{}", id);
            throw new BusinessException(ErrorCode.CONFLICT, "标签已被文章引用");
        }

        //删除标签
        int rows = tagMapper.deleteById(id);
        if (rows != 1) {
            log.error("【Service】删除标签失败，数据库写入异常, id={}", id);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "删除标签失败");
        }

        log.info("【Service】删除标签数据库操作完成，标签ID：{}", id);

    }


}
