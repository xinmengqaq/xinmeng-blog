package com.xinmengqaq.springboot.config.captcha;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
public class CaptchaCacheConfig {

    /**
     * 图形验证码缓存
     * 过期时间 2 分钟，最大 10000 条；业务模块负责为键添加自己的前缀
     */
    @Bean("captchaCache")
    public Cache<String, String> captchaCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(2))
                .maximumSize(10_000)
                .build();
    }

    /**
     * 图形验证码发放限频缓存
     * 过期时间 1 分钟，最大 50000 条；业务模块负责为键添加自己的前缀
     */
    @Bean("captchaIssueRateCache")
    public Cache<String, AtomicInteger> captchaIssueRateCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(1))
                .maximumSize(50_000)
                .build();
    }
}
