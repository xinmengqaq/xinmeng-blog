package com.xinmengqaq.springboot.admin.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.Data;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
public class AdminCaptchaCacheConfig {



     /**
      * 管理员验证码缓存
      * 过期时间为2分钟
      * 最大缓存大小为10000
      * 第一个String为验证码，第二个String为答案
      */
    @Bean("adminCaptchaCache")
    public Cache<String, String> adminCaptchaCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(2))
                .maximumSize(10_000)
                .build();
    }

     /**
      * 管理员验证码发放率缓存
      * 过期时间为1分钟
      * 最大缓存大小为50000
      *第一个String为客户端IP，第二个AtomicInteger为验证码发放率计数器
      * .build方法为缓存构建器，用于创建缓存实例，缓存实例用于存储和检索数据
      */
    @Bean("adminCaptchaIssueRateCache")
    public Cache<String, AtomicInteger> adminCaptchaIssueRateCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(1))
                .maximumSize(50_000)
                .build();
    }



}
