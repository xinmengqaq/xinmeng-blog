package com.xinmengqaq.springboot.user.aop;

import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.user.dto.EmailCodeSendDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailCodeSendDTO;
import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import com.xinmengqaq.springboot.user.service.BlogUserCaptchaService;
import com.xinmengqaq.springboot.user.service.impl.BlogUserAuthServiceImpl;
import com.xinmengqaq.springboot.user.service.impl.BlogUserEmailServiceImpl;
import com.xinmengqaq.springboot.user.service.impl.BlogUserProfileServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogUserCaptchaAspectTest {

    @Mock
    private BlogUserCaptchaService captchaService;

    @Mock
    private BlogUserMapper blogUserMapper;

    @Mock
    private BlogUserEmailServiceImpl emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    private BlogUserAuthServiceImpl authService;

    private BlogUserProfileServiceImpl profileService;

    @BeforeEach
    void setUp() {
        BlogUserCaptchaAspec aspect = new BlogUserCaptchaAspec();
        ReflectionTestUtils.setField(aspect, "blogUserCaptchaService", captchaService);

        BlogUserAuthServiceImpl target = new BlogUserAuthServiceImpl();
        ReflectionTestUtils.setField(target, "blogUserMapper", blogUserMapper);
        ReflectionTestUtils.setField(target, "blogUserEmailService", emailService);
        ReflectionTestUtils.setField(target, "passwordEncoder", passwordEncoder);

        AspectJProxyFactory proxyFactory = new AspectJProxyFactory(target);
        proxyFactory.setProxyTargetClass(true);
        proxyFactory.addAspect(aspect);
        authService = proxyFactory.getProxy();

        BlogUserProfileServiceImpl profileTarget = new BlogUserProfileServiceImpl();
        ReflectionTestUtils.setField(profileTarget, "blogUserMapper", blogUserMapper);
        ReflectionTestUtils.setField(profileTarget, "blogUserEmailService", emailService);
        ReflectionTestUtils.setField(profileTarget, "passwordEncoder", passwordEncoder);
        AspectJProxyFactory profileProxyFactory = new AspectJProxyFactory(profileTarget);
        profileProxyFactory.setProxyTargetClass(true);
        profileProxyFactory.addAspect(aspect);
        profileService = profileProxyFactory.getProxy();
    }

    @Test
    @DisplayName("图形验证码错误时 AOP 必须阻断注册发码方法，邮件和数据库均不能执行")
    void invalidCaptchaStopsRegisterEmailCodeBeforeTargetMethod() {
        EmailCodeSendDTO dto = emailCodeSendDTO("captcha-id", "Z9Z9");
        when(captchaService.consume("captcha-id", "Z9Z9")).thenReturn(false);

        assertThatThrownBy(() -> authService.sendRegisterEmailCode(dto, "203.0.113.10"))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.PARAM_ERROR.getCode()));

        verify(blogUserMapper, never()).selectCount(any());
        verify(emailService, never()).send(any(), any(), any());
    }

    @Test
    @DisplayName("过期或已消费的图形验证码会在目标方法执行前直接透传失败")
    void expiredCaptchaStopsRegisterEmailCodeBeforeTargetMethod() {
        EmailCodeSendDTO dto = emailCodeSendDTO("captcha-id", "A2B3");
        when(captchaService.consume("captcha-id", "A2B3"))
                .thenThrow(new BusinessException(ErrorCode.NOT_FOUND, "验证码已过期或已使用"));

        assertThatThrownBy(() -> authService.sendRegisterEmailCode(dto, "203.0.113.10"))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode()));

        verify(blogUserMapper, never()).selectCount(any());
        verify(emailService, never()).send(any(), any(), any());
    }

    @Test
    @DisplayName("图形验证码正确时才允许注册发码方法继续执行")
    void validCaptchaAllowsRegisterEmailCodeTargetMethod() {
        EmailCodeSendDTO dto = emailCodeSendDTO("captcha-id", "A2B3");
        when(captchaService.consume("captcha-id", "A2B3")).thenReturn(true);
        when(blogUserMapper.selectCount(any())).thenReturn(0L);

        authService.sendRegisterEmailCode(dto, "203.0.113.10");

        verify(emailService).send(eq(EmailCodePurpose.REGISTER), eq("reader@example.com"),
                eq("203.0.113.10"));
    }

    @Test
    @DisplayName("图形验证码错误时 AOP 必须阻断找回密码发码")
    void invalidCaptchaStopsPasswordResetEmailCode() {
        EmailCodeSendDTO dto = emailCodeSendDTO("captcha-id", "Z9Z9");
        dto.setEmail("reader@example.com");
        when(captchaService.consume("captcha-id", "Z9Z9")).thenReturn(false);

        assertThatThrownBy(() -> authService.sendPasswordResetCode(dto, "203.0.113.10"))
                .isInstanceOf(BusinessException.class);

        verify(emailService, never()).send(any(), any(), any());
    }

    @Test
    @DisplayName("图形验证码错误时 AOP 必须阻断换邮箱发码")
    void invalidCaptchaStopsEmailChangeCode() {
        BlogUserEmailCodeSendDTO dto = new BlogUserEmailCodeSendDTO();
        dto.setCurrentPassword("OldPassword123!");
        dto.setNewEmail("new-reader@example.com");
        dto.setCaptchaId("captcha-id");
        dto.setCaptchaCode("Z9Z9");
        when(captchaService.consume("captcha-id", "Z9Z9")).thenReturn(false);

        assertThatThrownBy(() -> profileService.sendEmailChangeCode(12L, dto, "203.0.113.10"))
                .isInstanceOf(BusinessException.class);

        verify(blogUserMapper, never()).selectById(any());
        verify(emailService, never()).send(any(), any(), any());
    }

    private EmailCodeSendDTO emailCodeSendDTO(String captchaId, String captchaCode) {
        EmailCodeSendDTO dto = new EmailCodeSendDTO();
        dto.setEmail(" Reader@Example.COM ");
        dto.setCaptchaId(captchaId);
        dto.setCaptchaCode(captchaCode);
        return dto;
    }
}
