package com.xinmengqaq.springboot.site.mapper;

import jakarta.annotation.Resource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.annotation.MapperScan;
import com.baomidou.mybatisplus.test.autoconfigure.MybatisPlusTest;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.jdbc.Sql;

import static org.assertj.core.api.Assertions.assertThat;

@MybatisPlusTest(properties = {
        "spring.config.import=optional:file:../springboot-web/src/main/resources/application-local.yml",
        "spring.datasource.url=jdbc:postgresql://localhost:5432/springboot_vue_test?sslmode=disable",
        "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS site_config_mapper_test; SET search_path TO site_config_mapper_test",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "mybatis-plus.mapper-locations=classpath*:mapper/**/*.xml",
        "mybatis-plus.configuration.map-underscore-to-camel-case=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@MapperScan("com.xinmengqaq.springboot.site.mapper")
class SiteConfigMapperTest {

    @Resource
    private SiteConfigMapper siteConfigMapper;

    @Test
    @DisplayName("站点背景有值时返回已保存的展示地址")
    @Sql(statements = {
            "drop table if exists site_config",
            "create table site_config (id bigint primary key, background_url varchar(500))",
            "insert into site_config (id, background_url) values (1, '/files/site/background.webp')"
    })
    void testSelectBackgroundUrlReturnsSavedUrl() {
        assertThat(siteConfigMapper.selectBackgroundUrl()).isEqualTo("/files/site/background.webp");
    }

    @Test
    @DisplayName("站点背景为空时返回 null")
    @Sql(statements = {
            "drop table if exists site_config",
            "create table site_config (id bigint primary key, background_url varchar(500))",
            "insert into site_config (id, background_url) values (1, null)"
    })
    void testSelectBackgroundUrlReturnsNull() {
        assertThat(siteConfigMapper.selectBackgroundUrl()).isNull();
    }

    @SpringBootConfiguration
    static class TestApplication {
    }
}
