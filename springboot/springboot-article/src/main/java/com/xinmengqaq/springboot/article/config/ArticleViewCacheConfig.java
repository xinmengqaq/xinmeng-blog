package com.xinmengqaq.springboot.article.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class ArticleViewCacheConfig {

    @Bean("articleViewCache")
    public Cache<String, Boolean> articleViewCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(30))
                .maximumSize(100_000)
                .build();
    }
}
