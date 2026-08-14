package com.xinmengqaq.springboot.user.controller;


import com.xinmengqaq.springboot.SpringbootApplication;
import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;
import com.xinmengqaq.springboot.user.service.BlogUserEmailService;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;


@EnabledIfEnvironmentVariable(named = "RUN_LIVE_MAIL_TEST", matches = "true")
@SpringBootTest(
        classes = SpringbootApplication.class,
        properties = {
                "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS user_mail_test; SET search_path TO user_mail_test"
        }
)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class BlogUserEmailOperationsMailTest {


    @Resource
    private BlogUserEmailService blogUserEmailService;


    @Test
    @DisplayName("真实发送注册验证码到指定邮箱")
    void shouldSendRegisterCodeToMailbox() {
        blogUserEmailService.send(
                EmailCodePurpose.REGISTER,
                "2765932196@qq.com",
                "127.0.0.1"
        );
    }
}
