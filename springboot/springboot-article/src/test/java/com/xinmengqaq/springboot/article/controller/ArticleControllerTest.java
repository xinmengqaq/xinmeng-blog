package com.xinmengqaq.springboot.article.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xinmengqaq.springboot.article.dto.ArticleBatchDeleteDTO;
import com.xinmengqaq.springboot.article.service.ArticleService;
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

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ArticleControllerTest {

    @Mock
    private ArticleService articleService;

    @InjectMocks
    private ArticleController articleController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(articleController).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("批量删除文章接口返回实际删除数量")
    void testBatchDeleteReturnsDeletedCount() throws Exception {
        ArticleBatchDeleteDTO dto = new ArticleBatchDeleteDTO();
        dto.setIds(List.of(1L, 2L, 999L));
        when(articleService.deleteByIds(dto.getIds())).thenReturn(2);

        mockMvc.perform(post("/api/admin/articles/batch-delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.msg").value("删除成功"))
                .andExpect(jsonPath("$.data.deletedCount").value(2));

        verify(articleService).deleteByIds(dto.getIds());
    }
}
