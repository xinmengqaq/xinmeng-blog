package com.xinmengqaq.springboot.admin.config;

import cn.hutool.captcha.LineCaptcha;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AdminCaptchaFactoryTest {

    @Test
    @DisplayName("工厂每次创建独立的验证码对象")
    void createReturnsNewCaptchaInstanceEveryTime() {
        AdminCaptchaFactory factory = new AdminCaptchaFactory();

        LineCaptcha firstCaptcha = factory.create();
        LineCaptcha secondCaptcha = factory.create();

        assertThat(firstCaptcha).isNotSameAs(secondCaptcha);
    }
}
