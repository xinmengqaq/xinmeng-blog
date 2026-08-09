package com.xinmengqaq.springboot.user.mapper;

import com.baomidou.mybatisplus.test.autoconfigure.MybatisPlusTest;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@MybatisPlusTest(properties = {
        "spring.config.import=optional:file:../springboot-web/src/main/resources/application-local.yml",
        "spring.datasource.url=jdbc:postgresql://localhost:5432/springboot_vue_test?sslmode=disable",
        "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS user_registration_test; SET search_path TO user_registration_test",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "mybatis-plus.mapper-locations=classpath*:mapper/**/*.xml",
        "mybatis-plus.type-aliases-package=com.xinmengqaq.springboot.user.entity",
        "mybatis-plus.configuration.map-underscore-to-camel-case=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@MapperScan("com.xinmengqaq.springboot.user.mapper")
class BlogUserMapperTest {

    @Resource
    private BlogUserMapper blogUserMapper;

    @Resource
    private DataSource dataSource;

    @BeforeEach
    void prepareTestTableOnlyOnTestDatabase() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertThat(connection.getMetaData().getURL()).contains("springboot_vue_test");
            try (Statement statement = connection.createStatement()) {
                statement.execute("DROP TABLE IF EXISTS blog_user");
                statement.execute("""
                        CREATE TABLE blog_user (
                            id BIGSERIAL PRIMARY KEY,
                            email VARCHAR(320) NOT NULL UNIQUE,
                            password VARCHAR(255) NOT NULL,
                            nickname VARCHAR(50) NOT NULL,
                            avatar VARCHAR(500),
                            status VARCHAR(20) NOT NULL DEFAULT 'enabled',
                            password_version INTEGER NOT NULL DEFAULT 1,
                            version INTEGER NOT NULL DEFAULT 1,
                            delete_at TIMESTAMPTZ,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                        """);
            }
        }
    }

    @Test
    @DisplayName("注册插入依赖数据库默认值时会得到启用状态、密码版本和创建时间")
    void insertAppliesRegistrationDefaults() {
        BlogUser user = new BlogUser();
        user.setEmail("reader@example.com");
        user.setPassword("$2a$10$stored-password-hash");
        user.setNickname("小读者");

        assertThat(blogUserMapper.insert(user)).isEqualTo(1);
        assertThat(user.getId()).isNotNull();

        BlogUser savedUser = blogUserMapper.selectById(user.getId());
        assertThat(savedUser.getEmail()).isEqualTo("reader@example.com");
        assertThat(savedUser.getStatus()).isEqualTo("enabled");
        assertThat(savedUser.getPasswordVersion()).isEqualTo(1);
        assertThat(savedUser.getVersion()).isEqualTo(1);
        assertThat(savedUser.getAvatar()).isNull();
        assertThat(savedUser.getDeleteAt()).isNull();
        assertThat(savedUser.getCreatedAt()).isNotNull();
        assertThat(savedUser.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("数据库唯一约束会拒绝同一规范化邮箱的第二次插入")
    void insertRejectsDuplicateNormalizedEmail() {
        BlogUser firstUser = user("reader@example.com");
        BlogUser duplicateUser = user("reader@example.com");
        blogUserMapper.insert(firstUser);

        assertThatThrownBy(() -> blogUserMapper.insert(duplicateUser))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private BlogUser user(String email) {
        BlogUser user = new BlogUser();
        user.setEmail(email);
        user.setPassword("$2a$10$stored-password-hash");
        user.setNickname("小读者");
        return user;
    }

    @SpringBootConfiguration
    static class TestApplication {
    }
}
