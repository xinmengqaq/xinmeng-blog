package com.xinmengqaq.springboot.user.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.SpringbootApplication;
import com.xinmengqaq.springboot.common.Result;
import com.xinmengqaq.springboot.config.JwtProperties;
import com.xinmengqaq.springboot.utils.JwtUtils;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = SpringbootApplication.class,
        properties = {
                "spring.datasource.url=jdbc:postgresql://localhost:5432/springboot_vue_test?sslmode=disable",
                "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS user_security_test; SET search_path TO user_security_test",
                "jwt.secret=eGlubWVuZ3FhcS1ibG9nLXNwcmluZ2Jvb3Q0LTIwMjY=",
                "jwt.expire-seconds=3600",
                "jwt.clock-skew-seconds=0"
        }
)
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(BlogUserSecurityIntegrationTest.TestProtectedEndpointConfiguration.class)
class BlogUserSecurityIntegrationTest {

    private static final long NORMAL_TOKEN_SECONDS = 3_600L;
    private static final long REMEMBER_ME_SECONDS = 1_209_600L;

    @Resource
    private MockMvc mockMvc;

    @Resource
    private DataSource dataSource;

    @Resource
    private PasswordEncoder passwordEncoder;

    @Resource
    private JwtUtils jwtUtils;

    @Resource
    private ObjectMapper objectMapper;

    @Resource(name = "loginErrorCountCache")
    private Cache<?, ?> loginErrorCountCache;

    @Resource(name = "loginLockdownCache")
    private Cache<?, ?> loginLockdownCache;

    @Resource(name = "tokenBlacklistCache")
    private Cache<String, Boolean> tokenBlacklistCache;

    @BeforeEach
    void prepareTestDatabaseAndCaches() throws SQLException {
        loginErrorCountCache.invalidateAll();
        loginLockdownCache.invalidateAll();
        tokenBlacklistCache.invalidateAll();
        resetBlogUserTable();
    }

    @AfterEach
    void cleanUpTestDatabase() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            assertTestDatabase(connection);
            try (Statement statement = connection.createStatement()) {
                statement.execute("DROP TABLE IF EXISTS blog_user");
            }
        }
    }

    @Test
    @DisplayName("正常登录返回可用于用户接口的常规有效期 Token，且不创建 Session Cookie")
    void loginIssuesUsableNormalLifetimeTokenWithoutSessionCookie() throws Exception {
        insertUser(12L, "reader@example.com", "StrongPassword123!", "enabled", 3);

        MvcResult result = mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginRequest("reader@example.com", "StrongPassword123!", false)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.id").value(12))
                .andExpect(jsonPath("$.data.email").value("reader@example.com"))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andReturn();

        String token = tokenFrom(result);
        assertThat(jwtUtils.parseToken(token).getSubject()).isEqualTo("12");
        assertThat(tokenLifetimeSeconds(token)).isEqualTo(NORMAL_TOKEN_SECONDS);

        mockMvc.perform(get("/api/user/test/principal")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data").value("12"));
    }

    @Test
    @DisplayName("记住我登录签发十四天 Token，仍不创建 Cookie 或 Session")
    void rememberMeLoginIssuesFourteenDayTokenWithoutSessionCookie() throws Exception {
        insertUser(12L, "reader@example.com", "StrongPassword123!", "enabled", 3);

        MvcResult result = mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginRequest("reader@example.com", "StrongPassword123!", true)))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andReturn();

        assertThat(tokenLifetimeSeconds(tokenFrom(result))).isEqualTo(REMEMBER_ME_SECONDS);
    }

    @Test
    @DisplayName("密码错误和不存在邮箱对外返回相同的认证失败结果")
    void loginDoesNotRevealWhetherTheEmailExists() throws Exception {
        insertUser(12L, "reader@example.com", "StrongPassword123!", "enabled", 3);

        mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginRequest("reader@example.com", "WrongPassword123!", false)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("401"))
                .andExpect(jsonPath("$.msg").value("邮箱或密码错误"));

        mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginRequest("missing@example.com", "WrongPassword123!", false)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("401"))
                .andExpect(jsonPath("$.msg").value("邮箱或密码错误"));
    }

    @Test
    @DisplayName("禁用和待删除账号不能通过登录获得用户 Token")
    void loginRejectsDisabledAndPendingDeletionUsers() throws Exception {
        insertUser(12L, "disabled@example.com", "StrongPassword123!", "disabled", 3);
        insertUser(13L, "pending@example.com", "StrongPassword123!", "pending_deletion", 3);

        mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginRequest("disabled@example.com", "StrongPassword123!", false)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("403"))
                .andExpect(jsonPath("$.msg").value("账号已被禁用"));

        mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginRequest("pending@example.com", "StrongPassword123!", false)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("409"))
                .andExpect(jsonPath("$.msg").value("账号正在注销，请选择恢复账号"));
    }

    @Test
    @DisplayName("同一规范化邮箱连续五次凭据错误后第六次正确密码也会进入冷却")
    void loginLocksAfterFiveCredentialFailures() throws Exception {
        insertUser(12L, "reader@example.com", "StrongPassword123!", "enabled", 3);

        for (int attempt = 0; attempt < 5; attempt++) {
            mockMvc.perform(post("/api/user/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginRequest("reader@EXAMPLE.com", "WrongPassword123!", false)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("401"));
        }

        mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginRequest("reader@example.com", "StrongPassword123!", false)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("429"))
                .andExpect(jsonPath("$.msg").value("冷却中，请稍后再试"));
    }

    @Test
    @DisplayName("缺失、管理员或已退出 Token 都不能访问受保护用户接口")
    void protectedUserEndpointRejectsMissingWrongTypeAndBlacklistedTokens() throws Exception {
        insertUser(12L, "reader@example.com", "StrongPassword123!", "enabled", 3);

        mockMvc.perform(get("/api/user/test/principal"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("401"))
                .andExpect(jsonPath("$.msg").value("登录已过期，请重新登录"));

        String adminToken = jwtUtils.createToken(12L, "admin", 3);
        mockMvc.perform(get("/api/user/test/principal")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("401"));

        String loggedOutToken = jwtUtils.createUserToken(12L, 3);
        tokenBlacklistCache.put(jwtUtils.parseToken(loggedOutToken).getId(), true);
        mockMvc.perform(get("/api/user/test/principal")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + loggedOutToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("401"));
    }

    @Test
    @DisplayName("篡改或过期的用户 Token 会在进入受保护接口前被拒绝")
    void protectedUserEndpointRejectsTamperedAndExpiredTokens() throws Exception {
        insertUser(12L, "reader@example.com", "StrongPassword123!", "enabled", 3);
        String validToken = jwtUtils.createUserToken(12L, 3);
        String tamperedToken = validToken + "x";
        String expiredToken = jwtUtilsWithExpireSeconds(-300L).createUserToken(12L, 3);

        mockMvc.perform(get("/api/user/test/principal")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tamperedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("401"));

        mockMvc.perform(get("/api/user/test/principal")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("401"));
    }

    @Test
    @DisplayName("退出登录只会使当前 jti 立即失效，不影响同一用户的其他 Token")
    void logoutInvalidatesOnlyCurrentToken() throws Exception {
        insertUser(12L, "reader@example.com", "StrongPassword123!", "enabled", 3);
        String currentToken = jwtUtils.createUserToken(12L, 3);
        String otherToken = jwtUtils.createUserToken(12L, 3);

        mockMvc.perform(post("/api/user/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + currentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.msg").value("退出成功"));

        mockMvc.perform(get("/api/user/test/principal")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + currentToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("401"));

        mockMvc.perform(get("/api/user/test/principal")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("12"));
    }

    private void resetBlogUserTable() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            assertTestDatabase(connection);
            try (Statement statement = connection.createStatement()) {
                statement.execute("DROP TABLE IF EXISTS blog_user");
                statement.execute("""
                        CREATE TABLE blog_user (
                            id BIGINT PRIMARY KEY,
                            email VARCHAR(320) NOT NULL UNIQUE,
                            password VARCHAR(255) NOT NULL,
                            nickname VARCHAR(50) NOT NULL,
                            avatar VARCHAR(500),
                            status VARCHAR(20) NOT NULL,
                            password_version INTEGER NOT NULL,
                            version INTEGER NOT NULL DEFAULT 1,
                            delete_at TIMESTAMPTZ,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                        """);
            }
        }
    }

    private void insertUser(Long id, String email, String password, String status, Integer passwordVersion) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            assertTestDatabase(connection);
            try (PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO blog_user (id, email, password, nickname, status, password_version)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """)) {
                statement.setLong(1, id);
                statement.setString(2, email);
                statement.setString(3, passwordEncoder.encode(password));
                statement.setString(4, "小读者");
                statement.setString(5, status);
                statement.setInt(6, passwordVersion);
                statement.executeUpdate();
            }
        }
    }

    private void assertTestDatabase(Connection connection) throws SQLException {
        assertThat(connection.getMetaData().getURL()).contains("springboot_vue_test");
        assertThat(connection.getSchema()).isEqualTo("user_security_test");
    }

    private String loginRequest(String email, String password, boolean rememberMe) {
        return """
                {
                  "email": "%s",
                  "password": "%s",
                  "rememberMe": %s
                }
                """.formatted(email, password, rememberMe);
    }

    private String tokenFrom(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("token")
                .asString();
    }

    private long tokenLifetimeSeconds(String token) {
        var claims = jwtUtils.parseToken(token);
        return (claims.getExpiration().getTime() - claims.getIssuedAt().getTime()) / 1_000L;
    }

    private JwtUtils jwtUtilsWithExpireSeconds(long expireSeconds) {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret("eGlubWVuZ3FhcS1ibG9nLXNwcmluZ2Jvb3Q0LTIwMjY=");
        jwtProperties.setExpireSeconds(expireSeconds);
        jwtProperties.setClockSkewSeconds(0L);

        JwtUtils testJwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(testJwtUtils, "jwtProperties", jwtProperties);
        return testJwtUtils;
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestProtectedEndpointConfiguration {

        @Bean
        TestProtectedUserController testProtectedUserController() {
            return new TestProtectedUserController();
        }
    }

    @RestController
    @RequestMapping("/api/user/test")
    static class TestProtectedUserController {

        @GetMapping("/principal")
        Result principal(Authentication authentication) {
            return Result.success(authentication.getName());
        }
    }
}
