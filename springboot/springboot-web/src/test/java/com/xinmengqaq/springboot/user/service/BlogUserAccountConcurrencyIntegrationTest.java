package com.xinmengqaq.springboot.user.service;

import com.xinmengqaq.springboot.SpringbootApplication;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.user.dto.BlogUserPasswordChangeDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRestoreDTO;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        classes = SpringbootApplication.class,
        properties = {
                "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS user_lifecycle_test; SET search_path TO user_lifecycle_test",
                "jwt.secret=eGlubWVuZ3FhcS1ibG9nLXNwcmluZ2Jvb3Q0LTIwMjY=",
                "jwt.expire-seconds=3600"
        }
)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class BlogUserAccountConcurrencyIntegrationTest {

    @Resource
    private BlogUserProfileService profileService;

    @Resource
    private BlogUserAuthService authService;

    @Resource
    private PasswordEncoder passwordEncoder;

    @Resource
    private DataSource dataSource;

    @BeforeEach
    void prepareTestTable() throws Exception {
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
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT ck_blog_user_delete_at CHECK (
                                (status = 'pending_deletion' AND delete_at IS NOT NULL)
                                OR (status IN ('enabled', 'disabled') AND delete_at IS NULL)
                            )
                        )
                        """);
            }
        }
    }

    @AfterEach
    void removeTestTable() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertTestDatabase(connection);
            try (Statement statement = connection.createStatement()) {
                statement.execute("DROP TABLE IF EXISTS blog_user");
            }
        }
    }

    @Test
    @DisplayName("两个并发修改密码请求只有一个能通过旧密码校验")
    void concurrentPasswordChangesAreSerializedByRowLock() throws Exception {
        insertUser("enabled", null);
        BlogUserPasswordChangeDTO dto = new BlogUserPasswordChangeDTO();
        dto.setCurrentPassword("OldPassword123!");
        dto.setNewPassword("NewPassword456!");

        List<Boolean> results = runConcurrently(() -> {
            try {
                profileService.changePassword(12L, dto);
                return true;
            } catch (BusinessException exception) {
                return false;
            }
        });

        assertThat(results).containsExactlyInAnyOrder(true, false);
        assertThat(readInt("password_version")).isEqualTo(4);
        assertThat(passwordEncoder.matches("NewPassword456!", readString("password"))).isTrue();
    }

    @Test
    @DisplayName("恢复账号会在同一次更新中恢复启用并清空删除时间")
    void restoreAccountAtomicallyClearsDeletionSchedule() throws Exception {
        insertUser("pending_deletion", OffsetDateTime.now().plusDays(1));
        BlogUserRestoreDTO dto = new BlogUserRestoreDTO();
        dto.setEmail("reader@example.com");
        dto.setPassword("OldPassword123!");

        authService.restoreAccount(dto);

        assertThat(readString("status")).isEqualTo("enabled");
        assertThat(readInt("password_version")).isEqualTo(4);
        assertThat(readValue("delete_at")).isNull();
    }

    @Test
    @DisplayName("两个并发恢复请求只有一个能完成待删除到启用的状态转换")
    void concurrentRestoresAreSerializedByRowLock() throws Exception {
        insertUser("pending_deletion", OffsetDateTime.now().plusDays(1));
        BlogUserRestoreDTO dto = new BlogUserRestoreDTO();
        dto.setEmail("reader@example.com");
        dto.setPassword("OldPassword123!");

        List<Boolean> results = runConcurrently(() -> {
            try {
                authService.restoreAccount(dto);
                return true;
            } catch (BusinessException exception) {
                return false;
            }
        });

        assertThat(results).containsExactlyInAnyOrder(true, false);
        assertThat(readString("status")).isEqualTo("enabled");
        assertThat(readInt("password_version")).isEqualTo(4);
        assertThat(readValue("delete_at")).isNull();
    }

    private List<Boolean> runConcurrently(Callable<Boolean> operation) throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> coordinated = () -> {
                ready.countDown();
                assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
                return operation.call();
            };
            Future<Boolean> first = executor.submit(coordinated);
            Future<Boolean> second = executor.submit(coordinated);
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            return List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }

    private void insertUser(String status, OffsetDateTime deleteAt) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertTestDatabase(connection);
            try (PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO blog_user
                        (id, email, password, nickname, status, password_version, delete_at)
                    VALUES (12, 'reader@example.com', ?, '小读者', ?, 3, ?)
                    """)) {
                statement.setString(1, passwordEncoder.encode("OldPassword123!"));
                statement.setString(2, status);
                statement.setObject(3, deleteAt);
                assertThat(statement.executeUpdate()).isEqualTo(1);
            }
        }
    }

    private int readInt(String column) throws Exception {
        return ((Number) readValue(column)).intValue();
    }

    private String readString(String column) throws Exception {
        return (String) readValue(column);
    }

    private Object readValue(String column) throws Exception {
        if (!List.of("password", "password_version", "status", "delete_at").contains(column)) {
            throw new IllegalArgumentException("不允许读取未声明的测试列");
        }
        try (Connection connection = dataSource.getConnection()) {
            assertTestDatabase(connection);
            try (Statement statement = connection.createStatement();
                 ResultSet resultSet = statement.executeQuery("SELECT " + column + " FROM blog_user WHERE id = 12")) {
                assertThat(resultSet.next()).isTrue();
                return resultSet.getObject(1);
            }
        }
    }

    private void assertTestDatabase(Connection connection) throws Exception {
        assertThat(connection.getMetaData().getURL()).contains("/springboot_vue_test");
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("SELECT current_database(), current_schema()")) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getString(1)).isEqualTo("springboot_vue_test");
            assertThat(resultSet.getString(2)).isEqualTo("user_lifecycle_test");
            System.out.printf("测试库门禁通过: url=%s, database=%s, schema=%s%n",
                    connection.getMetaData().getURL(), resultSet.getString(1), resultSet.getString(2));
        }
    }
}
