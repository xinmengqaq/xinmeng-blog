package com.xinmengqaq.springboot.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.MapperFeature;

/**
 * Jackson JSON 序列化配置
 */
@Configuration
public class JacksonConfig {

    @Bean
    public JsonMapperBuilderCustomizer jsonFieldOrderCustomizer() {
        /*
         * 笔记：[Spring] JsonMapperBuilderCustomizer
         * Spring Boot 3.x / Jackson 3 提供的定制器接口，返回一个 Customizer Bean，Spring 在构建全局 JsonMapper 时自动应用。
         * 相比直接替换 ObjectMapper，Customizer 只追加调整不整体覆盖，能和其他 Customizer 共存。
         * 这里关闭 SORT_PROPERTIES_ALPHABETICALLY，让 JSON 字段按类里声明顺序输出，方便接口文档和前端对齐字段顺序。
         */
        return builder -> builder.disable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY);
    }
}
