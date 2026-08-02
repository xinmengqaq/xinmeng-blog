package com.xinmengqaq.springboot.article.service.impl;

import com.xinmengqaq.springboot.article.dto.TagCreateDTO;
import com.xinmengqaq.springboot.article.dto.TagQueryDTO;
import com.xinmengqaq.springboot.article.dto.TagUpdateDTO;
import com.xinmengqaq.springboot.article.entity.Tag;
import com.xinmengqaq.springboot.article.mapper.TagMapper;
import com.xinmengqaq.springboot.article.vo.TagVO;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TagServiceImplTest {

    @Mock
    private TagMapper tagMapper;

    @InjectMocks
    private TagServiceImpl tagService;

    @Test
    @DisplayName("查询标签列表时直接返回Mapper查询出的VO列表")
    void testListReturnsMapperTagVOList() {
        TagQueryDTO queryDTO = new TagQueryDTO();
        TagVO tagVO = tagVO(1L, "Java", 2L);
        when(tagMapper.selectList(queryDTO)).thenReturn(List.of(tagVO));

        List<TagVO> result = tagService.list(queryDTO);

        assertThat(result).containsExactly(tagVO);
    }

    @Test
    @DisplayName("新增标签成功时会去除名称空格、补齐时间并返回新标签ID")
    void testInsertTrimsNameSetsTimeAndReturnsId() {
        TagCreateDTO dto = createDTO(" Java ");
        when(tagMapper.selectByName("Java")).thenReturn(null);
        when(tagMapper.insert(any(Tag.class))).thenAnswer(invocation -> {
            Tag tag = invocation.getArgument(0);
            tag.setId(10L);
            return 1L;
        });

        Long id = tagService.insert(dto);

        ArgumentCaptor<Tag> captor = ArgumentCaptor.forClass(Tag.class);
        verify(tagMapper).insert(captor.capture());
        Tag tag = captor.getValue();
        assertThat(id).isEqualTo(10L);
        assertThat(tag.getName()).isEqualTo("Java");
        assertThat(tag.getCreatedAt()).isNotNull();
        assertThat(tag.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("新增标签名称重复时返回数据冲突")
    void testInsertThrowsWhenNameExists() {
        TagCreateDTO dto = createDTO("Java");
        when(tagMapper.selectByName("Java")).thenReturn(tag(1L, "Java"));

        assertThatThrownBy(() -> tagService.insert(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("标签名已存在");
                });
        verify(tagMapper, never()).insert(any(Tag.class));
    }

    @Test
    @DisplayName("新增标签数据库未写入时返回系统异常")
    void testInsertThrowsWhenDatabaseWriteFails() {
        TagCreateDTO dto = createDTO("Java");
        when(tagMapper.selectByName("Java")).thenReturn(null);
        when(tagMapper.insert(any(Tag.class))).thenReturn(0L);

        assertThatThrownBy(() -> tagService.insert(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.SYSTEM_ERROR.getCode());
                    assertThat(exception.getMessage()).isEqualTo("新增标签失败");
                });
    }

    @Test
    @DisplayName("修改标签成功时会检查存在、检查重名并返回标签VO")
    void testUpdateByIdChecksExistenceAndReturnsVO() {
        TagUpdateDTO dto = updateDTO("碎碎念");
        TagVO tagVO = tagVO(1L, "碎碎念", 2L);
        when(tagMapper.selectById(1L)).thenReturn(tag(1L, "生活"));
        when(tagMapper.selectExistsByIdAndName(1L, "碎碎念")).thenReturn(null);
        when(tagMapper.updateById(any(Tag.class))).thenReturn(1);
        when(tagMapper.selectByIdVO(1L)).thenReturn(tagVO);

        TagVO result = tagService.updateById(1L, dto);

        ArgumentCaptor<Tag> captor = ArgumentCaptor.forClass(Tag.class);
        verify(tagMapper).updateById(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(1L);
        assertThat(captor.getValue().getName()).isEqualTo("碎碎念");
        assertThat(result).isSameAs(tagVO);
    }

    @Test
    @DisplayName("修改不存在的标签时返回标签不存在")
    void testUpdateByIdThrowsWhenTagMissing() {
        when(tagMapper.selectById(999L)).thenReturn(null);

        assertThatThrownBy(() -> tagService.updateById(999L, updateDTO("Java")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("标签不存在");
                });
        verify(tagMapper, never()).updateById(any(Tag.class));
    }

    @Test
    @DisplayName("修改标签名称被其他标签占用时返回数据冲突")
    void testUpdateByIdThrowsWhenNameExistsOnOtherTag() {
        when(tagMapper.selectById(1L)).thenReturn(tag(1L, "生活"));
        when(tagMapper.selectExistsByIdAndName(1L, "Java")).thenReturn(tag(2L, "Java"));

        assertThatThrownBy(() -> tagService.updateById(1L, updateDTO("Java")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("标签名已存在");
                });
        verify(tagMapper, never()).updateById(any(Tag.class));
    }

    @Test
    @DisplayName("删除标签成功时会先检查文章占用")
    void testDeleteByIdChecksArticleCountBeforeDelete() {
        when(tagMapper.selectByIdForUpdate(3L)).thenReturn(tag(3L, "空标签"));
        when(tagMapper.countArticleByTagId(3L)).thenReturn(0L);
        when(tagMapper.deleteById(3L)).thenReturn(1);

        tagService.deleteById(3L);

        verify(tagMapper).deleteById(3L);
    }

    @Test
    @DisplayName("删除被文章占用的标签时返回数据冲突")
    void testDeleteByIdThrowsWhenTagHasArticles() {
        when(tagMapper.selectByIdForUpdate(1L)).thenReturn(tag(1L, "Java"));
        when(tagMapper.countArticleByTagId(1L)).thenReturn(2L);

        assertThatThrownBy(() -> tagService.deleteById(1L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("标签已被文章引用");
                });
        verify(tagMapper, never()).deleteById(1L);
    }

    @Test
    @DisplayName("删除不存在的标签时返回标签不存在")
    void testDeleteByIdThrowsWhenTagMissing() {
        when(tagMapper.selectByIdForUpdate(999L)).thenReturn(null);

        assertThatThrownBy(() -> tagService.deleteById(999L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("标签不存在");
                });
    }

    private TagCreateDTO createDTO(String name) {
        TagCreateDTO dto = new TagCreateDTO();
        dto.setName(name);
        return dto;
    }

    private TagUpdateDTO updateDTO(String name) {
        TagUpdateDTO dto = new TagUpdateDTO();
        dto.setName(name);
        return dto;
    }

    private Tag tag(Long id, String name) {
        OffsetDateTime now = OffsetDateTime.now();
        Tag tag = new Tag();
        tag.setId(id);
        tag.setName(name);
        tag.setCreatedAt(now);
        tag.setUpdatedAt(now);
        return tag;
    }

    private TagVO tagVO(Long id, String name, Long articleCount) {
        return TagVO.builder()
                .id(id)
                .name(name)
                .articleCount(articleCount)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
    }

}
