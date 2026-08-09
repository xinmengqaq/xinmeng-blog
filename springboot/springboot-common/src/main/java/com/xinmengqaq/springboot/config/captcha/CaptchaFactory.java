package com.xinmengqaq.springboot.config.captcha;

import cn.hutool.captcha.CaptchaUtil;
import cn.hutool.captcha.LineCaptcha;
import cn.hutool.captcha.generator.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class CaptchaFactory {

    public LineCaptcha create() {
        LineCaptcha captcha = CaptchaUtil.createLineCaptcha(
                CaptchaConstants.IMAGE_WIDTH,
                CaptchaConstants.IMAGE_HEIGHT
        );
        captcha.setGenerator(new RandomGenerator(
                CaptchaConstants.CHARSET,
                CaptchaConstants.CODE_LENGTH
        ));
        captcha.setBackground(CaptchaConstants.BACKGROUND_COLOR);
        captcha.setStroke(CaptchaConstants.STROKE);
        captcha.setFont(CaptchaConstants.FONT);
        return captcha;
    }
}
