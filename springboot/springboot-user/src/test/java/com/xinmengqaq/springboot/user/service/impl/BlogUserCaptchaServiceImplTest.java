package com.xinmengqaq.springboot.user.service.impl;

import cn.hutool.captcha.LineCaptcha;
import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.config.captcha.CaptchaCacheConfig;
import com.xinmengqaq.springboot.config.captcha.CaptchaFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogUserCaptchaServiceImplTest {

    @Mock
    private CaptchaFactory captchaFactory;

    @InjectMocks
    private BlogUserCaptchaServiceImpl captchaService;

    private Cache<String, String> captchaCache;

    @BeforeEach
    void setUp() {
        CaptchaCacheConfig cacheConfig = new CaptchaCacheConfig();
        captchaCache = cacheConfig.captchaCache();
        ReflectionTestUtils.setField(captchaService, "captchaCache", captchaCache);
        ReflectionTestUtils.setField(captchaService, "issueRateCache", cacheConfig.captchaIssueRateCache());
    }

    @Test
    @DisplayName("同一 IP 一分钟内第 21 次获取用户图形验证码会被限流且不再生成图片")
    void createCaptchaRejectsRequestsBeyondIpLimit() {
        LineCaptcha captcha = mock(LineCaptcha.class);
        when(captchaFactory.create()).thenReturn(captcha);
        when(captcha.getCode()).thenReturn("A2B3");
        when(captcha.getImageBase64()).thenReturn("image-base64");

        for (int i = 0; i < 20; i++) {
            captchaService.CreateCaptcha("203.0.113.10");
        }

        assertThatThrownBy(() -> captchaService.CreateCaptcha("203.0.113.10"))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.TOO_MANY_REQUESTS.getCode()));
        verify(captchaFactory, times(20)).create();
    }

    @Test
    @DisplayName("正确的用户图形验证码只允许消费一次且忽略大小写")
    void consumeAcceptsCorrectCodeOnce() {
        captchaCache.put("user:captcha-id", "A2B3");

        assertThat(captchaService.consume("captcha-id", "a2b3")).isTrue();

        assertThatThrownBy(() -> captchaService.consume("captcha-id", "A2B3"))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode()));
    }

    @Test
    @DisplayName("图形验证码输错后也会立即作废，不能改填正确答案后继续发送邮件")
    void consumeInvalidatesCaptchaAfterWrongAnswer() {
        captchaCache.put("user:captcha-id", "A2B3");

        assertThat(captchaService.consume("captcha-id", "Z9Z9")).isFalse();

        assertThatThrownBy(() -> captchaService.consume("captcha-id", "A2B3"))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode()));
    }
}
