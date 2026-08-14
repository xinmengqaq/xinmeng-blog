package com.xinmengqaq.springboot.article.aspect;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.github.pagehelper.autoconfigure.PageHelperAutoConfiguration;
import com.xinmengqaq.springboot.article.dto.ArticleDTO;
import com.xinmengqaq.springboot.article.service.ArticleService;
import com.xinmengqaq.springboot.article.service.impl.ArticleServiceImpl;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.annotation.MapperScan;
import com.baomidou.mybatisplus.test.autoconfigure.MybatisPlusTest;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.aop.AopAutoConfiguration;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 文章操作切面集成测试。
 * 起容器 + 开 AOP + 装入 Service 和切面，验证切面真实拦截 save 并保持异常透传。
 */
@MybatisPlusTest(properties = {
        "spring.config.import=optional:file:../springboot-web/src/main/resources/application-local.yml",
        "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS article_operation_aspect_test; SET search_path TO article_operation_aspect_test",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "mybatis-plus.mapper-locations=classpath*:mapper/**/*.xml",
        "mybatis-plus.configuration.map-underscore-to-camel-case=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@MapperScan("com.xinmengqaq.springboot.article.mapper")
@ImportAutoConfiguration({AopAutoConfiguration.class, PageHelperAutoConfiguration.class})
@Import({ArticleServiceImpl.class, ArticleOperationAspect.class})
@Sql(scripts = {
        "/fixtures/article-relation-test-schema.sql",
        "/fixtures/article-relation-test-data.sql"
})
public class ArticleOperationAspectTest {

    @Resource
    private ArticleService articleService;

    private Logger aspectLogger;
    private ListAppender<ILoggingEvent> appender;


    @BeforeEach
    void attachLogAppender() {
        /*
         * 笔记：[日志] ListAppender 捕获日志
         * ListAppender 来自 ch.qos.logback.core.read，是一个把日志事件存进内存 List 的 Appender，专门给测试用。
         * 绑定到某个 Logger 后，该 Logger 输出的每条日志事件都会被存进 appender.list，
         * 测试通过断言 list 里的内容，验证某段逻辑确实输出了预期日志。
         * 用法三步：appender.start() 启用 -> logger.addAppender(appender) 绑定 -> 测试结束 detachAppender 解绑。
         * 注意 LoggerFactory.getLogger 返回 SLF4J Logger，要 cast 成 Logback 的
         *   ch.qos.logback.classic.Logger 才能调 addAppender，因为 addAppender 是 Logback 特有 API。
         */
        aspectLogger = (Logger) LoggerFactory.getLogger(ArticleOperationAspect.class);
        appender = new ListAppender<>();
        appender.start();
        aspectLogger.addAppender(appender);
    }

    @AfterEach
    void detachLogAppender() {
        aspectLogger.detachAppender(appender);
    }

    @Test
    @DisplayName("新增文章时切面拦截并打印耗时日志，返回值不被破坏")
    void testAspectInterceptsSaveAndPreservesReturnId() {
        ArticleDTO dto = new ArticleDTO();
        dto.setTitle("切面测试文章");
        dto.setContent("正文");
        dto.setCategoryId(1L);

        Long id = articleService.save(dto);

        assertThat(id).isNotNull();
        boolean logged = appender.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .anyMatch(msg -> msg.contains("文章新增完成"));
        assertThat(logged).as("切面应打印文章新增完成日志").isTrue();
    }

    @Test
    @DisplayName("新增文章分类不存在时异常透传，切面不记录完成日志")
    void testSaveExceptionPropagatesWithoutCompletionLog() {
        ArticleDTO dto = new ArticleDTO();
        dto.setTitle("分类不存在文章");
        dto.setContent("正文");
        dto.setCategoryId(999L);

        assertThatThrownBy(() -> articleService.save(dto))
                .isInstanceOf(BusinessException.class);

        boolean logged = appender.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .anyMatch(msg -> msg.contains("文章新增完成"));
        assertThat(logged).as("切面在异常时不应记录完成日志").isFalse();
    }

    @SpringBootConfiguration
    static class TestApplication {
    }
}
