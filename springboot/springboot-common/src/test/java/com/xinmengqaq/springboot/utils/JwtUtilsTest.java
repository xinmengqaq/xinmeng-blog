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
