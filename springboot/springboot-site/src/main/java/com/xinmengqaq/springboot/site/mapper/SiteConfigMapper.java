package com.xinmengqaq.springboot.site.mapper;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SiteConfigMapper {

    /**
     * 查询唯一站点配置的背景展示地址
     * @return 背景展示地址，未设置时返回 null
     */
    String selectBackgroundUrl();
}
