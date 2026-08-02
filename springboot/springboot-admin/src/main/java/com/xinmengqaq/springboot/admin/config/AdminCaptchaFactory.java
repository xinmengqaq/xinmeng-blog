package com.xinmengqaq.springboot.admin.config;

import cn.hutool.captcha.CaptchaUtil;
import cn.hutool.captcha.LineCaptcha;
import cn.hutool.captcha.generator.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class AdminCaptchaFactory {

    public LineCaptcha create() {
        LineCaptcha captcha = CaptchaUtil.createLineCaptcha(
                AdminCaptchaConstants.IMAGE_WIDTH,
                AdminCaptchaConstants.IMAGE_HEIGHT
        );
        captcha.setGenerator(new RandomGenerator(
                AdminCaptchaConstants.CHARSET,
                AdminCaptchaConstants.CODE_LENGTH
        ));
        captcha.setBackground(AdminCaptchaConstants.BACKGROUND_COLOR);
        captcha.setStroke(AdminCaptchaConstants.STROKE);
        captcha.setFont(AdminCaptchaConstants.FONT);
        return captcha;
    }
}
