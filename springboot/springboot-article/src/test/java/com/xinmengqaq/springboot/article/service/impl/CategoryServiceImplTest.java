package com.xinmengqaq.springboot.article.service.impl;

import com.xinmengqaq.springboot.article.dto.CategoryCreateDTO;
import com.xinmengqaq.springboot.article.dto.CategoryQueryDTO;
import com.xinmengqaq.springboot.article.dto.CategoryUpdateDTO;
import com.xinmengqaq.springboot.article.entity.Category;
import com.xinmengqaq.springboot.article.mapper.CategoryMapper;
import com.xinmengqaq.springboot.article.vo.CategoryVO;
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
class CategoryServiceImplTest {

    @Mock
    private CategoryMapper categoryMapper;

    @InjectMocks
    private CategoryServiceImpl categoryService;

    @Test
    @DisplayName("查询分类列表时直接返回Mapper查询出的VO列表")
    void testListReturnsMapperCategoryVOList() {
        CategoryQueryDTO queryDTO = new CategoryQueryDTO();
        CategoryVO categoryVO = categoryVO(1L, "Java", 2L);
        when(categoryMapper.selectListVO(queryDTO)).thenReturn(List.of(categoryVO));

        List<CategoryVO> result = categoryService.list(queryDTO);

        assertThat(result).containsExactly(categoryVO);
    }

    @Test
    @DisplayName("新增分类成功时会补齐时间并返回新分类ID")
    void testInsertSetsTimeAndReturnsId() {
        CategoryCreateDTO dto = createDTO("Java");
        when(categoryMapper.selectByName("Java")).thenReturn(null);
        when(categoryMapper.insert(any(Category.class))).thenAnswer(invocation -> {
            Category category = invocation.getArgument(0);
            category.setId(10L);
            return 1;
        });

        Long id = categoryService.insert(dto);

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
        verify(categoryMapper).insert(captor.capture());
        Category category = captor.getValue();
        assertThat(id).isEqualTo(10L);
        assertThat(category.getName()).isEqualTo("Java");
        assertThat(category.getCreatedAt()).isNotNull();
        assertThat(category.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("新增分类名称重复时返回数据冲突")
    void testInsertThrowsWhenNameExists() {
        CategoryCreateDTO dto = createDTO("Java");
        when(categoryMapper.selectByName("Java")).thenReturn(category(1L, "Java"));

        assertThatThrownBy(() -> categoryService.insert(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("分类名已存在");
                });
        verify(categoryMapper, never()).insert(any(Category.class));
    }

    @Test
    @DisplayName("新增分类数据库未写入时返回系统异常")
    void testInsertThrowsWhenDatabaseWriteFails() {
        CategoryCreateDTO dto = createDTO("Java");
        when(categoryMapper.selectByName("Java")).thenReturn(null);
        when(categoryMapper.insert(any(Category.class))).thenReturn(0);

        assertThatThrownBy(() -> categoryService.insert(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.SYSTEM_ERROR.getCode());
                    assertThat(exception.getMessage()).isEqualTo("新增分类失败");
                });
    }

    @Test
    @DisplayName("修改分类成功时会按ID更新并返回分类VO")
    void testUpdateByIdUpdatesCategoryAndReturnsVO() {
        CategoryUpdateDTO dto = updateDTO("Java 后端");
        CategoryVO categoryVO = categoryVO(1L, "Java 后端", 2L);
        when(categoryMapper.selectById(1L)).thenReturn(category(1L, "Java"));
        when(categoryMapper.selectExistsByIdAndName(1L, "Java 后端")).thenReturn(null);
        when(categoryMapper.updateById(any(Category.class))).thenReturn(1);
        when(categoryMapper.selectByIdVO(1L)).thenReturn(categoryVO);

        CategoryVO result = categoryService.updateById(1L, dto);

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
        verify(categoryMapper).updateById(captor.capture());
        Category category = captor.getValue();
        assertThat(category.getId()).isEqualTo(1L);
        assertThat(category.getName()).isEqualTo("Java 后端");
        assertThat(category.getUpdatedAt()).isNotNull();
        assertThat(result).isSameAs(categoryVO);
    }

    @Test
    @DisplayName("修改不存在的分类时返回分类不存在")
    void testUpdateByIdThrowsWhenCategoryMissing() {
        when(categoryMapper.selectById(999L)).thenReturn(null);

        assertThatThrownBy(() -> categoryService.updateById(999L, updateDTO("Java")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("分类不存在");
                });
        verify(categoryMapper, never()).updateById(any(Category.class));
    }

    @Test
    @DisplayName("修改分类名称被其他分类占用时返回数据冲突")
    void testUpdateByIdThrowsWhenNameExistsOnOtherCategory() {
        when(categoryMapper.selectById(1L)).thenReturn(category(1L, "Java"));
        when(categoryMapper.selectExistsByIdAndName(1L, "随笔")).thenReturn(category(2L, "随笔"));

        assertThatThrownBy(() -> categoryService.updateById(1L, updateDTO("随笔")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("分类名已存在");
                });
        verify(categoryMapper, never()).updateById(any(Category.class));
    }

    @Test
    @DisplayName("删除分类成功时会先校验存在和文章占用")
    void testDeleteByIdChecksExistenceAndArticleCountBeforeDelete() {
        when(categoryMapper.selectByIdForUpdate(3L)).thenReturn(category(3L, "空分类"));
        when(categoryMapper.countArticleByCategoryId(3L)).thenReturn(0L);
        when(categoryMapper.deleteById(3L)).thenReturn(1);

        categoryService.deleteById(3L);

        verify(categoryMapper).deleteById(3L);
    }

    @Test
    @DisplayName("删除不存在的分类时返回分类不存在")
    void testDeleteByIdThrowsWhenCategoryMissing() {
        when(categoryMapper.selectByIdForUpdate(999L)).thenReturn(null);

        assertThatThrownBy(() -> categoryService.deleteById(999L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("分类不存在");
                });
        verify(categoryMapper, never()).deleteById(999L);
    }

    @Test
    @DisplayName("删除被文章占用的分类时返回数据冲突")
    void testDeleteByIdThrowsWhenCategoryHasArticles() {
        when(categoryMapper.selectByIdForUpdate(1L)).thenReturn(category(1L, "Java"));
        when(categoryMapper.countArticleByCategoryId(1L)).thenReturn(2L);

        assertThatThrownBy(() -> categoryService.deleteById(1L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("分类下有文章，不能删除");
                });
        verify(categoryMapper, never()).deleteById(1L);
    }

    private CategoryCreateDTO createDTO(String name) {
        CategoryCreateDTO dto = new CategoryCreateDTO();
        dto.setName(name);
        dto.setDescription("分类描述");
        dto.setSortOrder(1);
        dto.setStatus("visible");
        return dto;
    }

    private CategoryUpdateDTO updateDTO(String name) {
        CategoryUpdateDTO dto = new CategoryUpdateDTO();
        dto.setName(name);
        dto.setDescription("更新描述");
        dto.setSortOrder(2);
        dto.setStatus("visible");
        return dto;
    }

    private Category category(Long id, String name) {
        OffsetDateTime now = OffsetDateTime.now();
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        category.setDescription("分类描述");
        category.setSortOrder(1);
        category.setStatus("visible");
        category.setCreatedAt(now);
        category.setUpdatedAt(now);
        return category;
    }

    private CategoryVO categoryVO(Long id, String name, Long articleCount) {
        return CategoryVO.builder()
                .id(id)
                .name(name)
                .description("分类描述")
                .sortOrder(1)
                .status("visible")
                .articleCount(articleCount)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
    }
}
