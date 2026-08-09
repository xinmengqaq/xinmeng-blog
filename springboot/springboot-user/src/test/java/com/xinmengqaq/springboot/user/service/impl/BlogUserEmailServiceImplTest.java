package com.xinmengqaq.springboot.user.service.impl;

import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.config.email.EmailCodeCacheConfig;
import com.xinmengqaq.springboot.config.email.EmailCodeGenerator;
import com.xinmengqaq.springboot.config.email.EmailCodeRecord;
import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogUserEmailServiceImplTest {

    @Mock
    private EmailCodeGenerator emailCodeGenerator;

    @Mock
    private JavaMailSender javaMailSender;

    @InjectMocks
    private BlogUserEmailServiceImpl emailService;

    private Cache<String, EmailCodeRecord> emailCodeCache;
    private Cache<String, Boolean> emailCodeCooldownCache;
    private Cache<String, AtomicInteger> emailCodeIpRateCache;
    private Cache<String, AtomicInteger> emailCodeEmailRateCache;

    @BeforeEach
    void setUp() {
        EmailCodeCacheConfig cacheConfig = new EmailCodeCacheConfig();
        emailCodeCache = cacheConfig.emailCodeRecordCache();
        emailCodeCooldownCache = cacheConfig.emailCodeCooldownCache();
        emailCodeIpRateCache = cacheConfig.emailCodeIpWindowCache();
        emailCodeEmailRateCache = cacheConfig.emailCodeEmailWindowCache();
        ReflectionTestUtils.setField(emailService, "emailCodeCache", emailCodeCache);
        ReflectionTestUtils.setField(emailService, "emailCodeCooldownCache", emailCodeCooldownCache);
        ReflectionTestUtils.setField(emailService, "emailCodeIpRateCache", emailCodeIpRateCache);
        ReflectionTestUtils.setField(emailService, "emailCodeEmailRateCache", emailCodeEmailRateCache);
        ReflectionTestUtils.setField(emailService, "fromAddress", "noreply@example.com");
    }

    @Test
    @DisplayName("邮箱验证码发送达到同一 IP 上限后必须拒绝且不触发邮件发送")
    void sendRejectsIpBeyondWindowLimitBeforeGeneratingOrSendingEmail() {
        String clientIp = "203.0.113.10";
        emailCodeIpRateCache.put("user:email-code:ip:" + clientIp, new AtomicInteger(20));

        assertThatThrownBy(() -> emailService.send(EmailCodePurpose.REGISTER, "reader@example.com", clientIp))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.TOO_MANY_REQUESTS.getCode()));

        verifyNoInteractions(emailCodeGenerator, javaMailSender);
    }

    @Test
    @DisplayName("同一邮箱处于冷却期时必须拒绝发送，不能借助重复请求绕过")
    void sendRejectsEmailDuringCooldownBeforeGeneratingOrSendingEmail() {
        String email = "reader@example.com";
        emailCodeCooldownCache.put(codeKey(EmailCodePurpose.REGISTER, email), true);

        assertThatThrownBy(() -> emailService.send(EmailCodePurpose.REGISTER, email, "203.0.113.10"))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.TOO_MANY_REQUESTS.getCode()));

        verifyNoInteractions(emailCodeGenerator, javaMailSender);
    }

    @Test
    @DisplayName("同一邮箱达到窗口上限后必须拒绝发送，不能继续调用邮件服务")
    void sendRejectsEmailBeyondWindowLimitBeforeGeneratingOrSendingEmail() {
        String email = "reader@example.com";
        emailCodeEmailRateCache.put(codeKey(EmailCodePurpose.REGISTER, email), new AtomicInteger(20));

        assertThatThrownBy(() -> emailService.send(EmailCodePurpose.REGISTER, email, "203.0.113.10"))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.TOO_MANY_REQUESTS.getCode()));

        verifyNoInteractions(emailCodeGenerator, javaMailSender);
    }

    @Test
    @DisplayName("邮件服务失败时不保留验证码或冷却标记，也不能返回伪成功")
    void sendClearsPendingStateWhenMailDeliveryFails() {
        String email = "reader@example.com";
        when(emailCodeGenerator.generate()).thenReturn("381642");
        when(javaMailSender.createMimeMessage()).thenThrow(new MailSendException("mail server unavailable"));

        assertThatThrownBy(() -> emailService.send(EmailCodePurpose.REGISTER, email, "203.0.113.10"))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.SYSTEM_ERROR.getCode()));

        assertThat(emailCodeCache.getIfPresent(codeKey(EmailCodePurpose.REGISTER, email))).isNull();
        assertThat(emailCodeCooldownCache.getIfPresent(codeKey(EmailCodePurpose.REGISTER, email))).isNull();
    }

    @Test
    @DisplayName("正确的注册邮箱验证码消费后会从缓存删除")
    void consumeDeletesCorrectCodeAfterFirstUse() {
        String email = "reader@example.com";
        emailCodeCache.put(codeKey(EmailCodePurpose.REGISTER, email), new EmailCodeRecord(381642, 0));

        assertThat(emailService.consume(EmailCodePurpose.REGISTER, email, "381642")).isTrue();
        assertThat(emailCodeCache.getIfPresent(codeKey(EmailCodePurpose.REGISTER, email))).isNull();
    }

    @Test
    @DisplayName("错误的邮箱验证码会保留记录并递增错误次数")
    void consumeIncrementsErrorCountForWrongCode() {
        String email = "reader@example.com";
        String key = codeKey(EmailCodePurpose.REGISTER, email);
        emailCodeCache.put(key, new EmailCodeRecord(381642, 0));

        assertThat(emailService.consume(EmailCodePurpose.REGISTER, email, "000000")).isFalse();

        EmailCodeRecord record = emailCodeCache.getIfPresent(key);
        assertThat(record).isNotNull();
        assertThat(record.getErrorCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("不同业务用途的邮箱验证码不能互相消费")
    void consumeRejectsCodeFromAnotherPurpose() {
        String email = "reader@example.com";
        emailCodeCache.put(codeKey(EmailCodePurpose.RESET_PASSWORD, email), new EmailCodeRecord(381642, 0));

        assertThatThrownBy(() -> emailService.consume(EmailCodePurpose.REGISTER, email, "381642"))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode()));
    }

    @Test
    @DisplayName("两个并发注册请求消费同一邮箱验证码时最多一个请求可以成功")
    void consumeAllowsOnlyOneConcurrentSuccess() throws Exception {
        String email = "reader@example.com";
        emailCodeCache.put(codeKey(EmailCodePurpose.REGISTER, email), new EmailCodeRecord(381642, 0));
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Callable<Boolean> consume = () -> {
                ready.countDown();
                start.await(5, TimeUnit.SECONDS);
                try {
                    return emailService.consume(EmailCodePurpose.REGISTER, email, "381642");
                } catch (BusinessException exception) {
                    return false;
                }
            };
            Future<Boolean> first = executor.submit(consume);
            Future<Boolean> second = executor.submit(consume);

            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            assertThat(List.of(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
        } finally {
            executor.shutdownNow();
        }
    }

    private String codeKey(EmailCodePurpose purpose, String email) {
        return "user:" + purpose.getValue() + ":" + email;
    }
}
