package com.xinmengqaq.springboot.user.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 登录错误限额缓存配置
 * 登录错误不超过 5 次，超过后进入冷却；缓存键由逻辑层拼接（建议 user:login-error: + 规范化邮箱）
 */
@Configuration
public class LoginLimitCacheConfig {

    /**
     * 登录错误次数计数
     * 过期时间 10 分钟，最大 50000 条；
     * 10 分钟窗口内错误累计达 5 次触发冷却，每次错误刷新过期时间
     */
    @Bean("loginErrorCountCache")
    public Cache<String, AtomicInteger> loginErrorCountCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(10))
                .maximumSize(50_000)
                .build();
    }

    /**
     * 登录冷却标记
     * 过期时间 5 分钟，最大 50000 条；
     * 错误达 5 次后写入，冷却期内拒绝登录，过期自动解除
     */
    @Bean("loginLockdownCache")
    public Cache<String, Boolean> loginLockdownCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(5))
                .maximumSize(50_000)
                .build();
    }
}
