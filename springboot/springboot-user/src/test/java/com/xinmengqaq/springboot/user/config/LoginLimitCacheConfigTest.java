package com.xinmengqaq.springboot.user.config;

import com.github.benmanes.caffeine.cache.Cache;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class LoginLimitCacheConfigTest {

    @Test
    @DisplayName("登录错误计数保留十分钟而冷却标记只保留五分钟")
    void loginFailureAndLockdownCachesUseSpecifiedExpiration() {
        LoginLimitCacheConfig config = new LoginLimitCacheConfig();

        assertThat(expireAfterWriteSeconds(config.loginErrorCountCache())).isEqualTo(600L);
        assertThat(expireAfterWriteSeconds(config.loginLockdownCache())).isEqualTo(300L);
    }

    private long expireAfterWriteSeconds(Cache<?, ?> cache) {
        return cache.policy()
                .expireAfterWrite()
                .orElseThrow(() -> new AssertionError("缓存未配置写入过期策略"))
                .getExpiresAfter(TimeUnit.SECONDS);
    }
}
