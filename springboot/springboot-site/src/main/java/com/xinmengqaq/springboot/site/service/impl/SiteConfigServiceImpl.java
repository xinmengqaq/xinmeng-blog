package com.xinmengqaq.springboot.site.service.impl;

import com.xinmengqaq.springboot.site.mapper.SiteConfigMapper;
import com.xinmengqaq.springboot.site.service.SiteConfigService;
import com.xinmengqaq.springboot.site.vo.PublicSiteBackgroundVO;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class SiteConfigServiceImpl implements SiteConfigService {

    @Resource
    private SiteConfigMapper siteConfigMapper;

    @Override
    public PublicSiteBackgroundVO getPublicBackground() {
        log.info("【Service】查询公开站点背景");
        PublicSiteBackgroundVO background = new PublicSiteBackgroundVO(siteConfigMapper.selectBackgroundUrl());
        log.info("【Service】查询公开站点背景完成, 是否已设置={}", background.getBackgroundUrl() != null);
        return background;
    }
}
