package com.xinmengqaq.springboot.site.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "公开站点背景")
public class PublicSiteBackgroundVO {

    @Schema(description = "已保存的站点背景展示地址，未设置时为 null", nullable = true)
    private String backgroundUrl;
}
