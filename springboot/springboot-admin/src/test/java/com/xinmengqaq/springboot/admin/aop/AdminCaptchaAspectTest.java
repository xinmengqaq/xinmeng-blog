package com.xinmengqaq.springboot.admin.aop;

import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.admin.config.AdminCaptchaConstants;
import com.xinmengqaq.springboot.admin.dto.AdminLoginDTO;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.config.captcha.CaptchaCacheConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AdminCaptchaAspectTest {

    private AdminCaptchaAspect aspect;
    private Cache<String, String> captchaCache;

    @BeforeEach
    void setUp() {
        aspect = new AdminCaptchaAspect();
        captchaCache = new CaptchaCacheConfig().captchaCache();
        ReflectionTestUtils.setField(aspect, "captchaCache", captchaCache);
    }

    @Test
    @DisplayName("管理员验证码校验成功后立即从缓存移除")
    void verifyConsumesCaptchaOnce() {
        AdminLoginDTO dto = loginDTO("captcha-id", "a2b3");
        captchaCache.put(AdminCaptchaConstants.CACHE_KEY_PREFIX + "captcha-id", "A2B3");

        aspect.verify(dto);

        assertThatThrownBy(() -> aspect.verify(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        org.assertj.core.api.Assertions.assertThat(exception.getCode())
                                .isEqualTo(ErrorCode.NOT_FOUND.getCode()));
    }

    @Test
    @DisplayName("管理员验证码错误时返回参数错误且不进入登录业务")
    void verifyRejectsWrongCaptcha() {
        AdminLoginDTO dto = loginDTO("captcha-id", "Z9Z9");
        captchaCache.put(AdminCaptchaConstants.CACHE_KEY_PREFIX + "captcha-id", "A2B3");

        assertThatThrownBy(() -> aspect.verify(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    org.assertj.core.api.Assertions.assertThat(exception.getCode())
                            .isEqualTo(ErrorCode.PARAM_ERROR.getCode());
                    org.assertj.core.api.Assertions.assertThat(exception.getMessage())
                            .isEqualTo("验证码错误或已过期，请重新输入");
                });
    }

    @Test
    @DisplayName("管理员验证码注解会在业务方法执行前触发切面")
    void annotationTriggersAspectBeforeBusinessMethod() {
        AdminLoginTarget target = new AdminLoginTarget();
        AspectJProxyFactory proxyFactory = new AspectJProxyFactory(target);
        proxyFactory.addAspect(aspect);
        AdminLoginTarget proxy = proxyFactory.getProxy();

        assertThatThrownBy(() -> proxy.login(loginDTO("missing", "A2B3")))
                .isInstanceOf(BusinessException.class);
        assertThat(target.called).isFalse();
    }

    private AdminLoginDTO loginDTO(String captchaId, String captchaCode) {
        AdminLoginDTO dto = new AdminLoginDTO();
        dto.setCaptchaID(captchaId);
        dto.setCaptchaCode(captchaCode);
        return dto;
    }

    static class AdminLoginTarget {

        private boolean called;

        @VerifyAdminCaptcha
        public void login(AdminLoginDTO adminLoginDTO) {
            called = true;
        }
    }
}
