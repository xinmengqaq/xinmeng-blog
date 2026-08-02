package com.xinmengqaq.springboot.site.controller;

import com.xinmengqaq.springboot.site.service.SiteConfigService;
import com.xinmengqaq.springboot.site.vo.PublicSiteBackgroundVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SiteConfigControllerTest {

    @Mock
    private SiteConfigService siteConfigService;

    @InjectMocks
    private SiteConfigController siteConfigController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(siteConfigController).build();
    }

    @Test
    @DisplayName("公开站点背景接口只返回已保存的展示地址")
    void testBackgroundReturnsSavedUrlOnly() throws Exception {
        when(siteConfigService.getPublicBackground())
                .thenReturn(new PublicSiteBackgroundVO("/files/site/background.webp"));

        mockMvc.perform(get("/api/site-config/background"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.backgroundUrl").value("/files/site/background.webp"))
                .andExpect(jsonPath("$.data.*", hasSize(1)))
                .andExpect(jsonPath("$.data.filePath").doesNotExist());
    }

    @Test
    @DisplayName("公开站点背景为空时明确返回 null 字段")
    void testBackgroundReturnsExplicitNull() throws Exception {
        when(siteConfigService.getPublicBackground()).thenReturn(new PublicSiteBackgroundVO(null));

        mockMvc.perform(get("/api/site-config/background"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.backgroundUrl").value(nullValue()));
    }
}
