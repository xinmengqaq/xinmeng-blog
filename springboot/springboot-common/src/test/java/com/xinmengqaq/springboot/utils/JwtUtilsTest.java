package com.xinmengqaq.springboot.utils;

import com.xinmengqaq.springboot.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilsTest {

    private static final String TEST_SECRET = "eGlubWVuZ3FhcS1ibG9nLXNwcmluZ2Jvb3Q0LTIwMjY=";

    @Test
    @DisplayName("创建 Token 后可以解析出基础载荷")
    void testCreateTokenAndParseClaims() {
        JwtUtils jwtUtils = newJwtUtils(1200L, 0L);
        Long adminId = 3_000_000_000L;

        String token = jwtUtils.createToken(adminId, "admin", 3);
        Claims claims = jwtUtils.parseToken(token);

        assertThat(claims.getSubject()).isEqualTo("3000000000");
        assertThat(jwtUtils.getTokenType(token)).isEqualTo("admin");
        assertThat(jwtUtils.getAdminId(token)).isEqualTo(adminId);
        assertThat(jwtUtils.getUsername(token)).isEqualTo("admin");
    }

    @Test
    @DisplayName("过期 Token 解析时会抛出过期异常")
    void testParseExpiredTokenThrowsException() {
        JwtUtils jwtUtils = newJwtUtils(-1L, 0L);
        String token = jwtUtils.createToken(1L, "admin", 1);

        assertThatThrownBy(() -> jwtUtils.parseToken(token))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    @DisplayName("非法 Token 解析时会抛出 JWT 异常")
    void testParseInvalidTokenThrowsException() {
        JwtUtils jwtUtils = newJwtUtils(1200L, 0L);

        assertThatThrownBy(() -> jwtUtils.parseToken("invalid-token"))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("用户 Token 包含用户身份、密码版本和唯一 jti")
    void createUserTokenContainsRequiredClaims() {
        JwtUtils jwtUtils = newJwtUtils(3_600L, 0L);

        String firstToken = jwtUtils.createUserToken(12L, 3);
        String secondToken = jwtUtils.createUserToken(12L, 3);
        Claims claims = jwtUtils.parseToken(firstToken);

        assertThat(claims.getId()).isNotBlank();
        assertThat(claims.getSubject()).isEqualTo("12");
        assertThat(claims.get("tokenType", String.class)).isEqualTo("user");
        assertThat(claims.get("passwordVersion", Integer.class)).isEqualTo(3);
        assertThat(claims.getExpiration().getTime() - claims.getIssuedAt().getTime()).isEqualTo(3_600_000L);
        assertThat(jwtUtils.parseToken(secondToken).getId()).isNotEqualTo(claims.getId());
    }

    @Test
    @DisplayName("记住我用户 Token 使用调用方指定的十四天有效期")
    void createUserTokenUsesRequestedRememberMeLifetime() {
        JwtUtils jwtUtils = newJwtUtils(3_600L, 0L);

        String token = jwtUtils.createUserToken(12L, 3, 1_209_600L);
        Claims claims = jwtUtils.parseToken(token);

        assertThat(claims.getExpiration().getTime() - claims.getIssuedAt().getTime())
                .isEqualTo(1_209_600_000L);
    }

    private JwtUtils newJwtUtils(Long expireSeconds, Long clockSkewSeconds) {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret(TEST_SECRET);
        jwtProperties.setExpireSeconds(expireSeconds);
        jwtProperties.setClockSkewSeconds(clockSkewSeconds);

        JwtUtils jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtProperties", jwtProperties);
        return jwtUtils;
    }
}
