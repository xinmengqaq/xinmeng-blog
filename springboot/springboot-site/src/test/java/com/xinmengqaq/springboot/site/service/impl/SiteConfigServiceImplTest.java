package com.xinmengqaq.springboot.site.service.impl;

import com.xinmengqaq.springboot.site.mapper.SiteConfigMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SiteConfigServiceImplTest {

    @Mock
    private SiteConfigMapper siteConfigMapper;

    @InjectMocks
    private SiteConfigServiceImpl siteConfigService;

    @Test
    @DisplayName("公开站点背景封装已保存的展示地址")
    void testGetPublicBackgroundReturnsSavedUrl() {
        when(siteConfigMapper.selectBackgroundUrl()).thenReturn("/files/site/background.webp");

        var result = siteConfigService.getPublicBackground();

        assertThat(result.getBackgroundUrl()).isEqualTo("/files/site/background.webp");
    }

    @Test
    @DisplayName("公开站点背景保留 null 空值")
    void testGetPublicBackgroundKeepsNull() {
        when(siteConfigMapper.selectBackgroundUrl()).thenReturn(null);

        var result = siteConfigService.getPublicBackground();

        assertThat(result.getBackgroundUrl()).isNull();
    }
}
