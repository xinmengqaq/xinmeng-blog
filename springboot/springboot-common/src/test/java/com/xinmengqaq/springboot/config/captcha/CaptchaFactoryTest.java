package com.xinmengqaq.springboot.config.captcha;

import cn.hutool.captcha.LineCaptcha;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CaptchaFactoryTest {

    @Test
    @DisplayName("工厂每次创建独立的验证码对象")
    void createReturnsNewCaptchaInstanceEveryTime() {
        CaptchaFactory factory = new CaptchaFactory();

        LineCaptcha firstCaptcha = factory.create();
        LineCaptcha secondCaptcha = factory.create();

        assertThat(firstCaptcha).isNotSameAs(secondCaptcha);
    }
}
