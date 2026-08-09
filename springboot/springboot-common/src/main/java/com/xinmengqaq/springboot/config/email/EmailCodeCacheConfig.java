package com.xinmengqaq.springboot.config.email;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
public class EmailCodeCacheConfig {


    /**
     * 邮箱验证码缓存
     * 过期时间 10 分钟，最大 10000 条
     * @return 邮箱验证码缓存实例
     */
    @Bean("emailCodeCache")
    public Cache<String,EmailCodeRecord> emailCodeRecordCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(10))
                .maximumSize(10000)
                .build();
    }

    /**
     * 冷却标记，同一邮箱+用途短时间内不能重复发送
     * 过期时间 60 秒，最大 10000 条；
     * @return 冷却标记缓存实例
     */
    @Bean("emailCodeCooldownCache")
    public Cache<String,Boolean> emailCodeCooldownCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(60))
                .maximumSize(10000)
                .build();
    }


    /**
     * IP 窗口限频计数
     * 过期时间 1 小时，最大 50000 条
     * @return IP 窗口限频计数缓存实例
     */
    @Bean("emailCodeIpWindowCache")
    public Cache<String, AtomicInteger> emailCodeIpWindowCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofHours(1))
                .maximumSize(50000)
                .build();
    }

    /**
     * 邮箱窗口限频计数
     * 过期时间 1 小时，最大 50000 条
     * 键去掉用途，收紧到总共 20 次/邮箱/小时
     * @return 邮箱窗口限频计数缓存实例
     */
    @Bean("emailCodeEmailWindowCache")
    public Cache<String, AtomicInteger> emailCodeEmailWindowCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofHours(1))
                .maximumSize(50000)
                .build();
    }
}
