package com.xinmengqaq.springboot.admin.aop;

import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.admin.config.AdminCaptchaConstants;
import com.xinmengqaq.springboot.admin.dto.AdminLoginDTO;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Slf4j
@Aspect
@Component
public class AdminCaptchaAspect {

    @Resource(name = "captchaCache")
    private Cache<String, String> captchaCache;

    @Before("@annotation(com.xinmengqaq.springboot.admin.aop.VerifyAdminCaptcha) && args(adminLoginDTO)")
    public void verify(AdminLoginDTO adminLoginDTO) {
        String captchaId = adminLoginDTO.getCaptchaID();
        String captchaCode = adminLoginDTO.getCaptchaCode();
        if (captchaId == null || captchaCode == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "验证码不能为空");
        }

        String expected = captchaCache.asMap().remove(AdminCaptchaConstants.CACHE_KEY_PREFIX + captchaId);
        if (expected == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "验证码答案获取失败");
        }

        String actual = captchaCode.strip().toUpperCase(Locale.ROOT);
        if (actual.length() != 4 || !expected.equals(actual)) {
            log.warn("管理员登录失败，验证码错误或已过期");
            throw new BusinessException(ErrorCode.PARAM_ERROR, "验证码错误或已过期，请重新输入");
        }
    }
}
