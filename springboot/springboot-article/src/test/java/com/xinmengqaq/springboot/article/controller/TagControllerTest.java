package com.xinmengqaq.springboot.article.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xinmengqaq.springboot.article.dto.TagCreateDTO;
import com.xinmengqaq.springboot.article.dto.TagUpdateDTO;
import com.xinmengqaq.springboot.article.service.TagService;
import com.xinmengqaq.springboot.article.vo.TagVO;
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
class TagControllerTest {

    @Mock
    private TagService tagService;

    @InjectMocks
    private TagController tagController;

    private MockMvc mockMvc;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(tagController).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("查询标签列表接口返回标签VO数组")
    void testListReturnsTagVOList() throws Exception {
        when(tagService.list(any())).thenReturn(List.of(tagVO(1L, "Java", 2L)));

        mockMvc.perform(get("/api/admin/tags")
                        .param("keyword", "Ja"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("Java"))
                .andExpect(jsonPath("$.data[0].articleCount").value(2));
    }

    @Test
    @DisplayName("新增标签接口返回新标签ID")
    void testInsertReturnsNewTagId() throws Exception {
        TagCreateDTO dto = new TagCreateDTO();
        dto.setName("生活");
        when(tagService.insert(any(TagCreateDTO.class))).thenReturn(10L);

        mockMvc.perform(post("/api/admin/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.id").value(10));
    }

    @Test
    @DisplayName("修改标签接口返回修改后的标签VO")
    void testUpdateByIdReturnsUpdatedTagVO() throws Exception {
        TagUpdateDTO dto = new TagUpdateDTO();
        dto.setName("碎碎念");
        when(tagService.updateById(eq(1L), any(TagUpdateDTO.class)))
                .thenReturn(tagVO(1L, "碎碎念", 2L));

        mockMvc.perform(put("/api/admin/tags/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("碎碎念"))
                .andExpect(jsonPath("$.data.articleCount").value(2));
    }

    @Test
    @DisplayName("删除标签接口返回删除成功")
    void testDeleteByIdReturnsSuccessMessage() throws Exception {
        mockMvc.perform(delete("/api/admin/tags/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.msg").value("删除成功"))
                .andExpect(jsonPath("$.data").doesNotExist());

        verify(tagService).deleteById(3L);
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
