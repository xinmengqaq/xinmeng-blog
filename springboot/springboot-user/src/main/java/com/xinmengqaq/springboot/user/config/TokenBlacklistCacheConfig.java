package com.xinmengqaq.springboot.user.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.xinmengqaq.springboot.config.JwtProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class TokenBlacklistCacheConfig {

    private static final long REMEMBER_ME_SECONDS = 14 * 24 * 3600L;


    @Bean
    Cache<String, Boolean> tokenBlacklistCache(JwtProperties jwtProperties) {
        long ttlSeconds = Math.max(jwtProperties.getExpireSeconds(), REMEMBER_ME_SECONDS);
        return Caffeine.newBuilder()
                .expireAfterWrite(ttlSeconds, TimeUnit.SECONDS)
                .maximumSize(100000)
                .build();
    }
}
