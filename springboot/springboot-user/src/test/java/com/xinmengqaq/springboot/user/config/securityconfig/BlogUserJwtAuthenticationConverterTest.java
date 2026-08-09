package com.xinmengqaq.springboot.user.config.securityconfig;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import com.xinmengqaq.springboot.user.enums.BlogUserStatus;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogUserJwtAuthenticationConverterTest {

    @Mock
    private BlogUserMapper blogUserMapper;

    @InjectMocks
    private BlogUserJwtAuthenticationConverter converter;

    private Cache<String, Boolean> tokenBlacklistCache;

    @BeforeEach
    void setUpCache() {
        tokenBlacklistCache = Caffeine.newBuilder().build();
        ReflectionTestUtils.setField(converter, "tokenBlacklistCache", tokenBlacklistCache);
    }

    @Test
    @DisplayName("启用且密码版本一致的用户 Token 会建立以 userId 为名称的认证主体")
    void convertBuildsUserAuthenticationForValidToken() {
        when(blogUserMapper.selectById(12L)).thenReturn(user(12L, BlogUserStatus.ENABLED, 3));

        JwtAuthenticationToken authentication = converter.convert(userJwt("current-jti", 12L, "user", 3L));

        assertThat(authentication.getName()).isEqualTo("12");
        assertThat(authentication.getAuthorities()).isEmpty();
    }

    @Test
    @DisplayName("已退出 Token 会在查询数据库前被黑名单拒绝")
    void convertRejectsBlacklistedTokenBeforeDatabaseLookup() {
        tokenBlacklistCache.put("logged-out-jti", true);

        assertThatThrownBy(() -> converter.convert(userJwt("logged-out-jti", 12L, "user", 3)))
                .isInstanceOf(InvalidBearerTokenException.class);

        verifyNoInteractions(blogUserMapper);
    }

    @Test
    @DisplayName("管理员或其他类型 Token 不能进入用户认证链路")
    void convertRejectsNonUserTokenBeforeDatabaseLookup() {
        assertThatThrownBy(() -> converter.convert(userJwt("admin-jti", 12L, "admin", 3)))
                .isInstanceOf(InvalidBearerTokenException.class);

        verifyNoInteractions(blogUserMapper);
    }

    @Test
    @DisplayName("用户不存在、账号状态异常或密码版本不一致时 Token 会失效")
    void convertRejectsDeletedDisabledPendingAndStaleTokens() {
        Jwt validShape = userJwt("current-jti", 12L, "user", 3);
        when(blogUserMapper.selectById(12L))
                .thenReturn(null)
                .thenReturn(user(12L, BlogUserStatus.DISABLED, 3))
                .thenReturn(user(12L, BlogUserStatus.PENDING_DELETION, 3))
                .thenReturn(user(12L, BlogUserStatus.ENABLED, 4));

        assertThatThrownBy(() -> converter.convert(validShape))
                .isInstanceOf(InvalidBearerTokenException.class);
        assertThatThrownBy(() -> converter.convert(validShape))
                .isInstanceOf(InvalidBearerTokenException.class);
        assertThatThrownBy(() -> converter.convert(validShape))
                .isInstanceOf(InvalidBearerTokenException.class);
        assertThatThrownBy(() -> converter.convert(validShape))
                .isInstanceOf(InvalidBearerTokenException.class);
    }

    private Jwt userJwt(String jti, Long userId, String tokenType, Number passwordVersion) {
        Instant issuedAt = Instant.parse("2026-08-09T00:00:00Z");
        return Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .jti(jti)
                .subject(String.valueOf(userId))
                .claim("tokenType", tokenType)
                .claim("passwordVersion", passwordVersion)
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plusSeconds(3_600))
                .build();
    }

    private BlogUser user(Long id, BlogUserStatus status, Integer passwordVersion) {
        BlogUser user = new BlogUser();
        user.setId(id);
        user.setStatus(status.getValue());
        user.setPasswordVersion(passwordVersion);
        return user;
    }
}
