package com.xinmengqaq.springboot.site.controller;

import com.xinmengqaq.springboot.common.Result;
import com.xinmengqaq.springboot.site.service.SiteConfigService;
import com.xinmengqaq.springboot.site.vo.PublicSiteBackgroundVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "公开站点配置", description = "前台读取站点公开展示配置")
@RestController
@RequestMapping("/api/site-config")
public class SiteConfigController {

    @Resource
    private SiteConfigService siteConfigService;

    /**
     * 查询公开站点背景
     * @return 已保存的背景展示地址，未设置时地址为 null
     */
    @Operation(summary = "查询公开站点背景")
    @GetMapping("/background")
    public Result background() {
        log.info("【Controller】接收到查询公开站点背景请求");
        PublicSiteBackgroundVO background = siteConfigService.getPublicBackground();
        log.info("【Controller】查询公开站点背景成功, 是否已设置={}", background.getBackgroundUrl() != null);
        return Result.success(background);
    }
}
