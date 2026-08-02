package com.xinmengqaq.springboot.article.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xinmengqaq.springboot.article.dto.CategoryCreateDTO;
import com.xinmengqaq.springboot.article.dto.CategoryUpdateDTO;
import com.xinmengqaq.springboot.article.service.CategoryService;
import com.xinmengqaq.springboot.article.vo.CategoryVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.OffsetDateTime;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    @Mock
    private CategoryService categoryService;

    @InjectMocks
    private CategoryController categoryController;

    private MockMvc mockMvc;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(categoryController).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("查询分类列表接口返回分类VO数组")
    void testListReturnsCategoryVOList() throws Exception {
        when(categoryService.list(any())).thenReturn(List.of(categoryVO(1L, "Java", 2L)));

        mockMvc.perform(get("/api/admin/categories")
                        .param("status", "visible"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("Java"))
                .andExpect(jsonPath("$.data[0].articleCount").value(2));
    }

    @Test
    @DisplayName("新增分类接口返回新分类ID")
    void testInsertReturnsNewCategoryId() throws Exception {
        CategoryCreateDTO dto = new CategoryCreateDTO();
        dto.setName("Java");
        dto.setDescription("Java 学习");
        dto.setSortOrder(1);
        dto.setStatus("visible");
        when(categoryService.insert(any(CategoryCreateDTO.class))).thenReturn(10L);

        mockMvc.perform(post("/api/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.id").value(10));
    }

    @Test
    @DisplayName("修改分类接口返回修改后的分类VO")
    void testUpdateByIdReturnsUpdatedCategoryVO() throws Exception {
        CategoryUpdateDTO dto = new CategoryUpdateDTO();
        dto.setName("Java 后端");
        dto.setDescription("后端学习");
        dto.setSortOrder(2);
        dto.setStatus("visible");
        when(categoryService.updateById(eq(1L), any(CategoryUpdateDTO.class)))
                .thenReturn(categoryVO(1L, "Java 后端", 2L));

        mockMvc.perform(put("/api/admin/categories/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("Java 后端"))
                .andExpect(jsonPath("$.data.articleCount").value(2));
    }

    @Test
    @DisplayName("删除分类接口返回删除成功")
    void testDeleteByIdReturnsSuccessMessage() throws Exception {
        mockMvc.perform(delete("/api/admin/categories/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.msg").value("删除成功"))
                .andExpect(jsonPath("$.data").doesNotExist());

        verify(categoryService).deleteById(3L);
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
