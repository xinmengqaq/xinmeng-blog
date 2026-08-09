package com.xinmengqaq.springboot.user.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.config.JwtProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class TokenBlacklistCacheConfigTest {

    @Test
    @DisplayName("黑名单缓存注册为 Bean 且至少覆盖十四天记住我 Token")
    void tokenBlacklistCacheIsRegisteredAndCoversRememberMeLifetime() {
        JwtProperties jwtProperties = jwtProperties(3_600L);

        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.registerBean(JwtProperties.class, () -> jwtProperties);
            context.register(TokenBlacklistCacheConfig.class);
            context.refresh();

            Cache<?, ?> cache = context.getBean("tokenBlacklistCache", Cache.class);
            assertThat(expireAfterWriteSeconds(cache)).isEqualTo(1_209_600L);
        }
    }

    @Test
    @DisplayName("常规 Token 有效期更长时黑名单缓存采用更长的有效期")
    void tokenBlacklistCacheUsesLongerConfiguredLifetime() {
        TokenBlacklistCacheConfig config = new TokenBlacklistCacheConfig();

        assertThat(expireAfterWriteSeconds(config.tokenBlacklistCache(jwtProperties(1_500_000L))))
                .isEqualTo(1_500_000L);
    }

    private JwtProperties jwtProperties(long expireSeconds) {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setExpireSeconds(expireSeconds);
        return jwtProperties;
    }

    private long expireAfterWriteSeconds(Cache<?, ?> cache) {
        return cache.policy()
                .expireAfterWrite()
                .orElseThrow(() -> new AssertionError("缓存未配置写入过期策略"))
                .getExpiresAfter(TimeUnit.SECONDS);
    }
}
