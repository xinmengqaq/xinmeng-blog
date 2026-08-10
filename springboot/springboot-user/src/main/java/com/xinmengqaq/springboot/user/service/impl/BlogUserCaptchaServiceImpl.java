package com.xinmengqaq.springboot.user.service.impl;

import cn.hutool.captcha.LineCaptcha;
import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.config.captcha.CaptchaFactory;
import com.xinmengqaq.springboot.user.aop.BlogUserAction;
import com.xinmengqaq.springboot.user.aop.BlogUserOperation;
import com.xinmengqaq.springboot.user.service.BlogUserCaptchaService;
import com.xinmengqaq.springboot.user.vo.CaptchaVO;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class BlogUserCaptchaServiceImpl implements BlogUserCaptchaService {

    private static final String CACHE_KEY_PREFIX = "user:";
    private static final int ISSUE_LIMIT_PER_MINUTE = 20;

    @Resource(name = "captchaCache")
    private Cache<String, String> captchaCache;

    @Resource(name = "captchaIssueRateCache")
    private Cache<String, AtomicInteger> issueRateCache;

    @Resource
    private CaptchaFactory captchaFactory;



    @Override
    @BlogUserOperation(BlogUserAction.ISSUE_CAPTCHA)
    public CaptchaVO CreateCaptcha(String clientIp) {
        String rateKey = CACHE_KEY_PREFIX + clientIp;
        AtomicInteger counter = issueRateCache.get(rateKey, key -> new AtomicInteger());
        if (counter.incrementAndGet() > ISSUE_LIMIT_PER_MINUTE) {
            throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS, "验证码发放过于频繁，1分钟内请稍后再试");
        }

        LineCaptcha captcha = captchaFactory.create();
        String captchaId = UUID.randomUUID().toString();
        captchaCache.put(CACHE_KEY_PREFIX + captchaId, captcha.getCode().toUpperCase(Locale.ROOT));

        return CaptchaVO.builder()
                .captchaId(captchaId)
                .imageBase64(captcha.getImageBase64())
                .build();
    }

    @Override
    public boolean consume(String captchaId, String captchaCode) {
        if (captchaId == null || captchaCode == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "验证码不能为空");
        }

        String expected = captchaCache.asMap().remove(CACHE_KEY_PREFIX + captchaId);
        if (expected == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "验证码已过期或已使用");
        }

        String actual = captchaCode.strip().toUpperCase(Locale.ROOT);
        return actual.length() == 4 && expected.equals(actual);
    }
}
