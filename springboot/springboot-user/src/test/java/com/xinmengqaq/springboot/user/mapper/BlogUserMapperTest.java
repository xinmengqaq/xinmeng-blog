package com.xinmengqaq.springboot.user.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.test.autoconfigure.MybatisPlusTest;
import com.xinmengqaq.springboot.config.MybatisPlusConfig;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@MybatisPlusTest(properties = {
        "spring.config.import=optional:file:../springboot-web/src/main/resources/application-local.yml",
        "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS user_mapper_test; SET search_path TO user_mapper_test",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "mybatis-plus.mapper-locations=classpath*:mapper/**/*.xml",
        "mybatis-plus.type-aliases-package=com.xinmengqaq.springboot.user.entity",
        "mybatis-plus.configuration.map-underscore-to-camel-case=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@MapperScan("com.xinmengqaq.springboot.user.mapper")
@Import(MybatisPlusConfig.class)
class BlogUserMapperTest {

    @Resource
    private BlogUserMapper blogUserMapper;

    @Resource
    private DataSource dataSource;

    @BeforeEach
    void prepareTestTableOnlyOnTestDatabase() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertTestDatabase(connection);
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

    @Test
    @DisplayName("按 ID 更新昵称时 MyBatis-Plus 只修改昵称并保留其他用户资料")
    void updateByIdChangesOnlyNickname() {
        BlogUser user = user("reader@example.com");
        user.setAvatar("/files/avatar/reader.png");
        blogUserMapper.insert(user);

        BlogUser patch = new BlogUser();
        patch.setId(user.getId());
        patch.setNickname("新的昵称");

        assertThat(blogUserMapper.updateById(patch)).isEqualTo(1);

        BlogUser savedUser = blogUserMapper.selectById(user.getId());
        assertThat(savedUser.getNickname()).isEqualTo("新的昵称");
        assertThat(savedUser.getEmail()).isEqualTo("reader@example.com");
        assertThat(savedUser.getPassword()).isEqualTo("$2a$10$stored-password-hash");
        assertThat(savedUser.getAvatar()).isEqualTo("/files/avatar/reader.png");
        assertThat(savedUser.getStatus()).isEqualTo("enabled");
        assertThat(savedUser.getPasswordVersion()).isEqualTo(1);
    }

    @Test
    @DisplayName("到期删除只删除待删除且已到期的账号并遵守批量上限")
    void deleteExpiredPendingUsersHonorsStatusDeadlineAndLimit() {
        OffsetDateTime now = OffsetDateTime.parse("2026-08-09T18:00:00+08:00");
        BlogUser firstExpired = pendingUser("first@example.com", now.minusHours(2));
        BlogUser secondExpired = pendingUser("second@example.com", now.minusHours(1));
        BlogUser future = pendingUser("future@example.com", now.plusHours(1));
        BlogUser enabled = user("enabled@example.com");
        enabled.setDeleteAt(now.minusHours(1));
        blogUserMapper.insert(firstExpired);
        blogUserMapper.insert(secondExpired);
        blogUserMapper.insert(future);
        blogUserMapper.insert(enabled);

        assertThat(blogUserMapper.deleteExpiredPendingUsers(now, 1)).isEqualTo(1);
        assertThat(blogUserMapper.selectById(future.getId())).isNotNull();
        assertThat(blogUserMapper.selectById(enabled.getId())).isNotNull();
        assertThat(blogUserMapper.selectCount(null)).isEqualTo(3);
    }

    @Test
    @DisplayName("MyBatis-Plus 分页按邮箱或昵称关键字和状态筛选，并按创建时间稳定排序")
    void selectPageFiltersAdminUserQueryWithStableOrder() {
        BlogUser emailMatch = user("reader@example.com");
        emailMatch.setNickname("普通读者");
        emailMatch.setCreatedAt(OffsetDateTime.parse("2026-08-09T10:00:00+08:00"));

        BlogUser nicknameMatch = user("nickname@example.com");
        nicknameMatch.setNickname("资深 reader");
        nicknameMatch.setCreatedAt(OffsetDateTime.parse("2026-08-09T12:00:00+08:00"));

        BlogUser secondEmailMatch = user("reader-second@example.com");
        secondEmailMatch.setNickname("第二位读者");
        secondEmailMatch.setCreatedAt(OffsetDateTime.parse("2026-08-09T11:00:00+08:00"));

        BlogUser disabledMatch = user("reader-disabled@example.com");
        disabledMatch.setStatus("disabled");
        disabledMatch.setCreatedAt(OffsetDateTime.parse("2026-08-09T13:00:00+08:00"));

        BlogUser unrelated = user("writer@example.com");
        unrelated.setNickname("作者");
        unrelated.setCreatedAt(OffsetDateTime.parse("2026-08-09T14:00:00+08:00"));

        blogUserMapper.insert(emailMatch);
        blogUserMapper.insert(nicknameMatch);
        blogUserMapper.insert(secondEmailMatch);
        blogUserMapper.insert(disabledMatch);
        blogUserMapper.insert(unrelated);

        LambdaQueryWrapper<BlogUser> query = new LambdaQueryWrapper<BlogUser>()
                .and(wrapper -> wrapper.like(BlogUser::getEmail, "reader")
                        .or()
                        .like(BlogUser::getNickname, "reader"))
                .eq(BlogUser::getStatus, "enabled")
                .orderByDesc(BlogUser::getCreatedAt)
                .orderByDesc(BlogUser::getId);
        Page<BlogUser> result = blogUserMapper.selectPage(new Page<>(1, 2), query);

        assertThat(result.getTotal()).isEqualTo(3L);
        assertThat(result.getPages()).isEqualTo(2L);
        assertThat(result.getRecords())
                .extracting(BlogUser::getId)
                .containsExactly(nicknameMatch.getId(), secondEmailMatch.getId());
        assertThat(result.getRecords()).allMatch(user -> "enabled".equals(user.getStatus()));
    }

    private BlogUser user(String email) {
        BlogUser user = new BlogUser();
        user.setEmail(email);
        user.setPassword("$2a$10$stored-password-hash");
        user.setNickname("小读者");
        return user;
    }

    private BlogUser pendingUser(String email, OffsetDateTime deleteAt) {
        BlogUser user = user(email);
        user.setStatus("pending_deletion");
        user.setDeleteAt(deleteAt);
        return user;
    }

    private void assertTestDatabase(Connection connection) throws Exception {
        assertThat(connection.getMetaData().getURL()).contains("/springboot_vue_test");
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("SELECT current_database(), current_schema()")) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getString(1)).isEqualTo("springboot_vue_test");
            assertThat(resultSet.getString(2)).isEqualTo("user_mapper_test");
            System.out.printf("测试库门禁通过: url=%s, database=%s, schema=%s%n",
                    connection.getMetaData().getURL(), resultSet.getString(1), resultSet.getString(2));
        }
    }

    @SpringBootConfiguration
    static class TestApplication {
    }
}
