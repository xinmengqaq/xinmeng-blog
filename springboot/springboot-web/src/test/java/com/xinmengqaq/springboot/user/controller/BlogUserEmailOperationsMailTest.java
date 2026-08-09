package com.xinmengqaq.springboot.user.controller;


import com.xinmengqaq.springboot.SpringbootApplication;
import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;
import com.xinmengqaq.springboot.user.service.BlogUserEmailService;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;


@SpringBootTest(classes = SpringbootApplication.class)
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
