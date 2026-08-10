package com.xinmengqaq.springboot.user.mapper;

import com.baomidou.mybatisplus.test.autoconfigure.MybatisPlusTest;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;

@MybatisPlusTest(properties = {
        "spring.config.import=optional:file:../springboot-web/src/main/resources/application-local.yml",
        "spring.datasource.url=jdbc:postgresql://localhost:5432/springboot_vue_test?sslmode=disable",
        "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS user_lock_test; SET search_path TO user_lock_test",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "mybatis-plus.mapper-locations=classpath*:mapper/**/*.xml",
        "mybatis-plus.type-aliases-package=com.xinmengqaq.springboot.user.entity",
        "mybatis-plus.configuration.map-underscore-to-camel-case=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@MapperScan("com.xinmengqaq.springboot.user.mapper")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class BlogUserMapperLockTest {

    private static final String TEST_DATABASE = "springboot_vue_test";
    private static final String TEST_SCHEMA = "user_lock_test";

    @Resource
    private BlogUserMapper blogUserMapper;

    @Resource
    private DataSource dataSource;

    @Resource
    private JdbcTemplate jdbcTemplate;

    @Resource
    private PlatformTransactionManager transactionManager;

    private Long userId;

    @BeforeEach
    void prepareTestTable() throws Exception {
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
        BlogUser user = new BlogUser();
        user.setEmail("reader@example.com");
        user.setPassword("encoded-password");
        user.setNickname("小读者");
        assertThat(blogUserMapper.insert(user)).isEqualTo(1);
        userId = user.getId();
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
    @DisplayName("按 ID 的 FOR UPDATE 会阻塞另一个事务获取同一用户锁")
    void selectByIdForUpdateBlocksCompetingTransaction() throws Exception {
        assertCompetingTransactionIsBlocked(() -> blogUserMapper.selectByIdForUpdate(userId));
    }

    @Test
    @DisplayName("按邮箱的 FOR UPDATE 会阻塞另一个事务获取同一用户锁")
    void selectByEmailForUpdateBlocksCompetingTransaction() throws Exception {
        assertCompetingTransactionIsBlocked(() -> blogUserMapper.selectByEmailForUpdate("reader@example.com"));
    }

    private void assertCompetingTransactionIsBlocked(Supplier<BlogUser> lockQuery) throws Exception {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        CountDownLatch firstLocked = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger firstPid = new AtomicInteger();
        AtomicInteger secondPid = new AtomicInteger();
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<?> first = executor.submit(() -> transaction.executeWithoutResult(status -> {
                firstPid.set(jdbcTemplate.queryForObject("SELECT pg_backend_pid()", Integer.class));
                assertThat(lockQuery.get()).isNotNull();
                firstLocked.countDown();
                await(releaseFirst);
            }));

            assertThat(firstLocked.await(5, TimeUnit.SECONDS)).isTrue();
            Future<?> second = executor.submit(() -> transaction.executeWithoutResult(status -> {
                secondPid.set(jdbcTemplate.queryForObject("SELECT pg_backend_pid()", Integer.class));
                secondStarted.countDown();
                assertThat(lockQuery.get()).isNotNull();
            }));

            assertThat(secondStarted.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(waitUntilBlocked(secondPid.get(), firstPid.get())).isTrue();

            releaseFirst.countDown();
            first.get(5, TimeUnit.SECONDS);
            second.get(5, TimeUnit.SECONDS);
        } finally {
            releaseFirst.countDown();
            executor.shutdownNow();
        }
    }

    private boolean waitUntilBlocked(int blockedPid, int blockerPid) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            Boolean blocked = jdbcTemplate.queryForObject(
                    "SELECT ? = ANY(pg_blocking_pids(?))", Boolean.class, blockerPid, blockedPid);
            if (Boolean.TRUE.equals(blocked)) {
                return true;
            }
            TimeUnit.MILLISECONDS.sleep(25);
        }
        return false;
    }

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new AssertionError("等待释放数据库行锁超时");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError("等待数据库行锁时线程被中断", exception);
        }
    }

    private void assertTestDatabase(Connection connection) throws Exception {
        assertThat(connection.getMetaData().getURL())
                .isEqualTo("jdbc:postgresql://localhost:5432/springboot_vue_test?sslmode=disable");
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("SELECT current_database(), current_schema()")) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getString(1)).isEqualTo(TEST_DATABASE);
            assertThat(resultSet.getString(2)).isEqualTo(TEST_SCHEMA);
            System.out.printf("测试库门禁通过: url=%s, database=%s, schema=%s%n",
                    connection.getMetaData().getURL(), resultSet.getString(1), resultSet.getString(2));
        }
    }

    @SpringBootConfiguration
    static class TestApplication {
    }
}
