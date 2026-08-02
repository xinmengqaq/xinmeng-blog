package com.xinmengqaq.springboot.site.service;

import com.xinmengqaq.springboot.site.vo.PublicSiteBackgroundVO;

public interface SiteConfigService {

    /**
     * 查询公开站点背景
     * @return 公开站点背景视图对象
     */
    PublicSiteBackgroundVO getPublicBackground();
}
