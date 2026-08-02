package com.xinmengqaq.springboot.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@Data
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {

    /*
     * 笔记：[Spring] @Component
     * 通用组件注解，标记类由 Spring 容器管理，是 @Service/@Controller/@Repository 的父注解。
     * 被扫描后注册为 Bean，Bean 名默认是类名首字母小写。属性配置类、工具类等不属于明确分层的组件用它。
     */

    /*
     * 笔记：[Spring·JWT] @ConfigurationProperties(prefix="jwt")
     * 把 yml 中 prefix 前缀下的属性绑定到 Bean 字段：jwt.secret -> secret、jwt.expire-seconds -> expireSeconds。
     * 支持松散绑定：yml 的 expire-seconds（短横线）能映射到 expireSeconds（驼峰），@Data 提供 setter 完成注入。
     * 配合 @Component 注册为 Bean 后，其他组件注入它即可拿到类型安全的配置值，比 @Value 逐个读更清爽。
     */

    /**
     * JWT 密钥，配置文件中存 Base64 字符串
     */
    private String secret;

    /**
     * Token 过期时间，单位秒
     */
    private Long expireSeconds;

    /**
     * 时钟偏移量，单位秒
     */
    private Long clockSkewSeconds;


}
