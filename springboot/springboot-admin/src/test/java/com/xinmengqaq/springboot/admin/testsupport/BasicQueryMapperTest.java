package com.xinmengqaq.springboot.admin.testsupport;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.annotation.MapperScan;
import com.baomidou.mybatisplus.test.autoconfigure.MybatisPlusTest;
import jakarta.annotation.Resource;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.jdbc.Sql;

import static org.assertj.core.api.Assertions.assertThat;

@MybatisPlusTest(properties = {
        "spring.config.import=optional:file:../springboot-web/src/main/resources/application-local.yml",
        "spring.datasource.url=jdbc:postgresql://localhost:5432/springboot_vue_test?sslmode=disable",
        "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS basic_query_test; SET search_path TO basic_query_test",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "mybatis-plus.mapper-locations=classpath*:mapper/**/*.xml"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@MapperScan("com.xinmengqaq.springboot.admin.testsupport")
@Sql(statements = {
        "drop table if exists basic_query",
        "create table basic_query (id int primary key, name varchar(50) not null)",
        "insert into basic_query (id, name) values (1, 'basic-query')"
})
class BasicQueryMapperTest {

    /*
     * 笔记：[Boot·MyBatis-Plus] @MybatisPlusTest
     * MyBatis-Plus 专用测试切片注解，只装配 Mapper 相关组件（SqlSessionFactory、Mapper 扫描），不加载 Service/Controller。
     * 默认会替换数据源；配合 @AutoConfigureTestDatabase(replace = NONE) 后，properties 指定的 PostgreSQL 测试库才会生效。
     * 比起 @SpringBootTest 全量启动，切片测试更快、更聚焦。
     */

    /*
     * 笔记：[Boot·PgSQL] PostgreSQL 测试库
     * Mapper 测试直接连接 springboot_vue_test，验证真实 PostgreSQL 方言和驱动行为。
     * 测试凭据复用 springboot-web 的 application-local.yml，本测试只覆盖连接的数据库名。
     */

    /*
     * 笔记：[Boot] @Sql
     * Spring Test 的测试数据注解，statements 属性内联 SQL 数组，在测试方法前自动执行。
     * 也可用 scripts 属性指向外部 .sql 文件。每条按顺序执行，常用于建表 + 插入测试数据。
     * @MybatisPlusTest 默认回滚测试事务，@Sql 建表和测试数据会在测试结束后随事务回滚。
     */

    @Resource
    private BasicQueryMapper basicQueryMapper;

    @Test
    @DisplayName("MyBatis XML 基础查询可以正常返回数据")
    void testSelectNameByIdReturnsName() {
        String name = basicQueryMapper.selectNameById(1);

        assertThat(name).isEqualTo("basic-query");
    }

    @Test
    @DisplayName("MyBatis XML 查询不到数据时返回 null")
    void testSelectNameByIdReturnsNullWhenMissing() {
        String name = basicQueryMapper.selectNameById(999);

        assertThat(name).isNull();
    }
    @SpringBootConfiguration
    static class TestApplication {
    }
}
