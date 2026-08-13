package com.xinmengqaq.springboot.user.service.impl;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.config.JwtProperties;
import com.xinmengqaq.springboot.user.config.BlogUserDetails;
import com.xinmengqaq.springboot.user.dto.BlogUserLoginDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRegisterDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserPasswordResetDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRestoreDTO;
import com.xinmengqaq.springboot.user.dto.EmailCodeSendDTO;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import com.xinmengqaq.springboot.user.enums.BlogUserStatus;
import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import com.xinmengqaq.springboot.user.service.BlogUserEmailService;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import com.xinmengqaq.springboot.utils.JwtUtils;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.atomic.AtomicInteger;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogUserAuthServiceImplTest {

    @Mock
    private BlogUserMapper blogUserMapper;

    @Mock
    private BlogUserEmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManage;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private JwtProperties jwtProperties;

    @InjectMocks
    private BlogUserAuthServiceImpl authService;

    private Cache<String, AtomicInteger> loginErrorCountCache;

    private Cache<String, Boolean> loginLockdownCache;

    private Cache<String, Boolean> tokenBlacklistCache;

    @BeforeEach
    void setUpCaches() {
        loginErrorCountCache = Caffeine.newBuilder().build();
        loginLockdownCache = Caffeine.newBuilder().build();
        tokenBlacklistCache = Caffeine.newBuilder().build();
        ReflectionTestUtils.setField(authService, "loginErrorCountCache", loginErrorCountCache);
        ReflectionTestUtils.setField(authService, "loginLockdownCache", loginLockdownCache);
        ReflectionTestUtils.setField(authService, "tokenBlacklistCache", tokenBlacklistCache);
    }

    @Test
    @DisplayName("未注册邮箱发送注册验证码时会规范化邮箱并交给用户邮箱服务")
    void sendRegisterEmailCodeNormalizesAvailableEmail() {
        EmailCodeSendDTO dto = emailCodeSendDTO(" Reader@Example.COM ");
        when(blogUserMapper.selectCount(any())).thenReturn(0L);

        authService.sendRegisterEmailCode(dto, "203.0.113.10");

        verify(emailService).send(EmailCodePurpose.REGISTER, "reader@example.com", "203.0.113.10");
    }

    @Test
    @DisplayName("已注册邮箱不能发送注册验证码，也不能调用邮件服务")
    void sendRegisterEmailCodeRejectsExistingNormalizedEmail() {
        when(blogUserMapper.selectCount(any())).thenReturn(1L);

        assertThatThrownBy(() -> authService.sendRegisterEmailCode(emailCodeSendDTO("Reader@Example.COM"), "203.0.113.10"))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("邮箱已被使用");
                });

        verify(emailService, never()).send(any(), any(), any());
    }

    @Test
    @DisplayName("正确注册邮箱验证码会创建规范化且启用的用户，并且只保存密码哈希")
    void registerCreatesEnabledUserWithHashedPassword() {
        BlogUserRegisterDTO dto = registerDTO(" Reader@Example.COM ", "381642", "StrongPassword123!", "小读者");
        when(blogUserMapper.selectCount(any())).thenReturn(0L);
        when(emailService.consume(EmailCodePurpose.REGISTER, "reader@example.com", "381642")).thenReturn(true);
        when(passwordEncoder.encode("StrongPassword123!")).thenReturn("$2a$10$stored-password-hash");
        when(blogUserMapper.insert(any(BlogUser.class))).thenReturn(1);

        authService.register(dto);

        ArgumentCaptor<BlogUser> userCaptor = ArgumentCaptor.forClass(BlogUser.class);
        verify(blogUserMapper).insert(userCaptor.capture());
        BlogUser savedUser = userCaptor.getValue();
        assertThat(savedUser.getEmail()).isEqualTo("reader@example.com");
        assertThat(savedUser.getPassword()).isEqualTo("$2a$10$stored-password-hash");
        assertThat(savedUser.getPassword()).isNotEqualTo("StrongPassword123!");
        assertThat(savedUser.getNickname()).isEqualTo("小读者");
        assertThat(savedUser.getStatus()).isEqualTo("enabled");
        assertThat(BlogUserStatus.ENABLED.getDescription()).isEqualTo("启用");
        assertThat(savedUser.getAvatar()).isNull();
        assertThat(savedUser.getDeleteAt()).isNull();
    }

    @Test
    @DisplayName("邮箱验证码错误时不加密密码也不创建用户")
    void registerRejectsInvalidEmailCodeBeforeEncodingOrInserting() {
        BlogUserRegisterDTO dto = registerDTO("reader@example.com", "000000", "StrongPassword123!", "小读者");
        when(blogUserMapper.selectCount(any())).thenReturn(0L);
        when(emailService.consume(EmailCodePurpose.REGISTER, "reader@example.com", "000000")).thenReturn(false);

        assertThatThrownBy(() -> authService.register(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.PARAM_ERROR.getCode()));

        verify(passwordEncoder, never()).encode(any());
        verify(blogUserMapper, never()).insert(any(BlogUser.class));
    }

    @Test
    @DisplayName("已注册邮箱提交注册时返回冲突且保留验证码，不应继续消费或插入")
    void registerRejectsExistingEmailBeforeConsumingCode() {
        when(blogUserMapper.selectCount(any())).thenReturn(1L);

        assertThatThrownBy(() -> authService.register(registerDTO(
                "Reader@Example.COM", "381642", "StrongPassword123!", "小读者")))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode()));

        verify(emailService, never()).consume(any(), any(), any());
        verify(passwordEncoder, never()).encode(any());
        verify(blogUserMapper, never()).insert(any(BlogUser.class));
    }

    @Test
    @DisplayName("数据库插入影响行数异常时注册必须失败")
    void registerRejectsUnexpectedInsertRowCount() {
        BlogUserRegisterDTO dto = registerDTO("reader@example.com", "381642", "StrongPassword123!", "小读者");
        when(blogUserMapper.selectCount(any())).thenReturn(0L);
        when(emailService.consume(EmailCodePurpose.REGISTER, "reader@example.com", "381642")).thenReturn(true);
        when(passwordEncoder.encode("StrongPassword123!")).thenReturn("$2a$10$stored-password-hash");
        when(blogUserMapper.insert(any(BlogUser.class))).thenReturn(0);

        assertThatThrownBy(() -> authService.register(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.SYSTEM_ERROR.getCode()));
    }

    @Test
    @DisplayName("数据库唯一约束异常会向上抛出")
    void registerPropagatesDuplicateKeyException() {
        BlogUserRegisterDTO dto = registerDTO("reader@example.com", "381642", "StrongPassword123!", "小读者");
        when(blogUserMapper.selectCount(any())).thenReturn(0L);
        when(emailService.consume(EmailCodePurpose.REGISTER, "reader@example.com", "381642")).thenReturn(true);
        when(passwordEncoder.encode("StrongPassword123!")).thenReturn("$2a$10$stored-password-hash");
        when(blogUserMapper.insert(any(BlogUser.class))).thenThrow(new DuplicateKeyException("blog_user_email_key"));

        assertThatThrownBy(() -> authService.register(dto))
                .isInstanceOf(DuplicateKeyException.class)
                .hasMessage("blog_user_email_key");
    }

    @Test
    @DisplayName("启用用户登录会规范化邮箱并按常规有效期签发用户 Token")
    void loginAuthenticatesEnabledUserWithNormalTokenLifetime() {
        BlogUser user = user(12L, "reader@example.com", BlogUserStatus.ENABLED, 3);
        Authentication authentication = authenticated(user);
        when(authenticationManage.authenticate(any())).thenReturn(authentication);
        when(jwtProperties.getExpireSeconds()).thenReturn(3_600L);
        when(jwtUtils.createUserToken(12L, 3, 3_600L)).thenReturn("normal-token");

        BlogUserVO vo = authService.login(loginDTO(" Reader@Example.COM ", "StrongPassword123!", false));

        ArgumentCaptor<Authentication> authenticationCaptor = ArgumentCaptor.forClass(Authentication.class);
        verify(authenticationManage).authenticate(authenticationCaptor.capture());
        assertThat(authenticationCaptor.getValue().getName()).isEqualTo("reader@example.com");
        assertThat(vo.getId()).isEqualTo(12L);
        assertThat(vo.getEmail()).isEqualTo("reader@example.com");
        assertThat(vo.getToken()).isEqualTo("normal-token");
        verify(jwtUtils).createUserToken(12L, 3, 3_600L);
    }

    @Test
    @DisplayName("记住我登录会固定签发十四天用户 Token")
    void loginUsesFourteenDayTokenLifetimeWhenRememberMeIsEnabled() {
        BlogUser user = user(12L, "reader@example.com", BlogUserStatus.ENABLED, 3);
        Authentication authentication = authenticated(user);
        when(authenticationManage.authenticate(any())).thenReturn(authentication);
        when(jwtUtils.createUserToken(12L, 3, 1_209_600L)).thenReturn("remember-me-token");

        BlogUserVO vo = authService.login(loginDTO("reader@example.com", "StrongPassword123!", true));

        assertThat(vo.getToken()).isEqualTo("remember-me-token");
        verify(jwtUtils).createUserToken(12L, 3, 1_209_600L);
        verifyNoInteractions(jwtProperties);
    }

    @Test
    @DisplayName("凭据错误累计五次后会锁定规范化邮箱并拒绝第六次登录")
    void loginLocksNormalizedEmailAfterFiveCredentialFailures() {
        when(authenticationManage.authenticate(any())).thenThrow(new BadCredentialsException("bad credentials"));

        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> authService.login(loginDTO(" Reader@Example.COM ", "WrongPassword123!", false)))
                    .isInstanceOfSatisfying(BusinessException.class, exception -> {
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED.getCode());
                        assertThat(exception.getMessage()).isEqualTo("邮箱或密码错误");
                    });
        }

        String cacheKey = "user:login-error:reader@example.com";
        assertThat(loginErrorCountCache.getIfPresent(cacheKey)).isNotNull();
        assertThat(loginErrorCountCache.getIfPresent(cacheKey).get()).isEqualTo(5);
        assertThat(loginLockdownCache.getIfPresent(cacheKey)).isTrue();

        assertThatThrownBy(() -> authService.login(loginDTO("reader@EXAMPLE.com", "StrongPassword123!", false)))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.TOO_MANY_REQUESTS.getCode());
                    assertThat(exception.getMessage()).isEqualTo("冷却中，请稍后再试");
                });

        verify(authenticationManage, times(5)).authenticate(any());
    }

    @Test
    @DisplayName("一个邮箱进入冷却不会阻止另一个邮箱继续认证")
    void loginLockdownIsScopedToEachNormalizedEmail() {
        when(authenticationManage.authenticate(any())).thenThrow(new BadCredentialsException("bad credentials"));

        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> authService.login(loginDTO("reader@example.com", "WrongPassword123!", false)))
                    .isInstanceOf(BusinessException.class);
        }

        assertThatThrownBy(() -> authService.login(loginDTO("another@example.com", "WrongPassword123!", false)))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED.getCode()));
        assertThat(loginLockdownCache.getIfPresent("user:login-error:another@example.com")).isNull();
        verify(authenticationManage, times(6)).authenticate(any());
    }

    @Test
    @DisplayName("冷却标记清除后启用用户可以恢复正常登录")
    void loginCanResumeAfterLockdownExpires() {
        String cacheKey = "user:login-error:reader@example.com";
        loginLockdownCache.put(cacheKey, true);
        BlogUser user = user(12L, "reader@example.com", BlogUserStatus.ENABLED, 3);
        Authentication authentication = authenticated(user);
        when(authenticationManage.authenticate(any())).thenReturn(authentication);
        when(jwtProperties.getExpireSeconds()).thenReturn(3_600L);
        when(jwtUtils.createUserToken(12L, 3, 3_600L)).thenReturn("normal-token");

        loginLockdownCache.invalidate(cacheKey);
        BlogUserVO vo = authService.login(loginDTO("reader@example.com", "StrongPassword123!", false));

        assertThat(vo.getToken()).isEqualTo("normal-token");
    }

    @Test
    @DisplayName("禁用和待删除用户通过密码认证后仍不能签发 Token")
    void loginRejectsDisabledAndPendingDeletionUsers() {
        BlogUser disabled = user(12L, "disabled@example.com", BlogUserStatus.DISABLED, 3);
        BlogUser pendingDeletion = user(13L, "pending@example.com", BlogUserStatus.PENDING_DELETION, 3);
        Authentication disabledAuthentication = authenticated(disabled);
        Authentication pendingDeletionAuthentication = authenticated(pendingDeletion);
        when(authenticationManage.authenticate(any()))
                .thenReturn(disabledAuthentication)
                .thenReturn(pendingDeletionAuthentication);

        assertThatThrownBy(() -> authService.login(loginDTO("disabled@example.com", "StrongPassword123!", false)))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.FORBIDDEN.getCode());
                    assertThat(exception.getMessage()).isEqualTo("账号已被禁用");
                });
        assertThatThrownBy(() -> authService.login(loginDTO("pending@example.com", "StrongPassword123!", false)))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("账号正在注销，请选择恢复账号");
                });

        verifyNoInteractions(jwtUtils);
    }

    @Test
    @DisplayName("退出登录只会将当前 Token 的 jti 写入黑名单")
    void logoutBlacklistsOnlyTheCurrentToken() {
        Claims claims = mock(Claims.class);
        when(jwtUtils.parseToken("current-token")).thenReturn(claims);
        when(claims.getId()).thenReturn("current-jti");

        authService.logout("current-token");

        assertThat(tokenBlacklistCache.getIfPresent("current-jti")).isTrue();
        assertThat(tokenBlacklistCache.getIfPresent("other-jti")).isNull();
        verifyNoInteractions(blogUserMapper);
    }

    @Test
    @DisplayName("找回密码发码对不存在邮箱返回相同结果且不发送邮件")
    void sendPasswordResetCodeDoesNotRevealMissingEmail() {
        when(blogUserMapper.selectCount(any())).thenReturn(0L);

        authService.sendPasswordResetCode(emailCodeSendDTO(" Missing@Example.COM "), "203.0.113.10");

        verify(emailService, never()).send(any(), any(), any());
    }

    @Test
    @DisplayName("重置密码会按邮箱锁定用户并同时递增凭证版本和乐观锁版本")
    void resetPasswordLocksUserAndInvalidatesExistingTokens() {
        BlogUser user = user(12L, "reader@example.com", BlogUserStatus.ENABLED, 3);
        user.setVersion(7);
        when(blogUserMapper.selectByEmailForUpdate("reader@example.com")).thenReturn(user);
        when(emailService.consume(EmailCodePurpose.RESET_PASSWORD, "reader@example.com", "381642"))
                .thenReturn(true);
        when(passwordEncoder.matches("NewPassword456!", user.getPassword())).thenReturn(false);
        when(passwordEncoder.encode("NewPassword456!")).thenReturn("encoded-new-password");
        when(blogUserMapper.updateById(user)).thenReturn(1);

        authService.resetPassword(passwordResetDTO());

        assertThat(user.getPassword()).isEqualTo("encoded-new-password");
        assertThat(user.getPasswordVersion()).isEqualTo(4);
        assertThat(user.getVersion()).isEqualTo(7);
        verify(blogUserMapper).selectByEmailForUpdate("reader@example.com");
        verify(blogUserMapper).updateById(user);
    }

    @Test
    @DisplayName("恢复账号会按邮箱锁定待删除用户并清空删除时间")
    void restoreAccountLocksPendingUserAndInvalidatesOldTokens() {
        BlogUser user = user(12L, "reader@example.com", BlogUserStatus.PENDING_DELETION, 3);
        user.setVersion(7);
        user.setDeleteAt(OffsetDateTime.now().plusDays(1));
        when(blogUserMapper.selectByEmailForUpdate("reader@example.com")).thenReturn(user);
        when(passwordEncoder.matches("StrongPassword123!", user.getPassword())).thenReturn(true);
        when(blogUserMapper.restoreAccount(12L, 7, 4)).thenReturn(1);

        authService.restoreAccount(restoreDTO());

        assertThat(user.getStatus()).isEqualTo(BlogUserStatus.ENABLED.getValue());
        assertThat(user.getDeleteAt()).isNull();
        assertThat(user.getPasswordVersion()).isEqualTo(4);
        verify(blogUserMapper).selectByEmailForUpdate("reader@example.com");
        verify(blogUserMapper).restoreAccount(12L, 7, 4);
    }

    @Test
    @DisplayName("超过恢复期限的账号按不存在处理且不能更新")
    void restoreAccountRejectsExpiredPendingUser() {
        BlogUser user = user(12L, "reader@example.com", BlogUserStatus.PENDING_DELETION, 3);
        user.setDeleteAt(OffsetDateTime.now().minusSeconds(1));
        when(blogUserMapper.selectByEmailForUpdate("reader@example.com")).thenReturn(user);

        assertThatThrownBy(() -> authService.restoreAccount(restoreDTO()))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode()));

        verify(blogUserMapper, never()).restoreAccount(anyLong(), anyInt(), anyInt());
    }

    private EmailCodeSendDTO emailCodeSendDTO(String email) {
        EmailCodeSendDTO dto = new EmailCodeSendDTO();
        dto.setEmail(email);
        dto.setCaptchaId("captcha-id");
        dto.setCaptchaCode("A2B3");
        return dto;
    }

    private BlogUserRegisterDTO registerDTO(String email, String emailCode, String password, String nickname) {
        BlogUserRegisterDTO dto = new BlogUserRegisterDTO();
        dto.setEmail(email);
        dto.setEmailCode(emailCode);
        dto.setPassword(password);
        dto.setNickname(nickname);
        return dto;
    }

    private BlogUserLoginDTO loginDTO(String email, String password, Boolean rememberMe) {
        BlogUserLoginDTO dto = new BlogUserLoginDTO();
        dto.setEmail(email);
        dto.setPassword(password);
        dto.setRememberMe(rememberMe);
        return dto;
    }

    private BlogUserPasswordResetDTO passwordResetDTO() {
        BlogUserPasswordResetDTO dto = new BlogUserPasswordResetDTO();
        dto.setEmail(" Reader@Example.COM ");
        dto.setEmailCode("381642");
        dto.setNewPassword("NewPassword456!");
        return dto;
    }

    private BlogUserRestoreDTO restoreDTO() {
        BlogUserRestoreDTO dto = new BlogUserRestoreDTO();
        dto.setEmail(" Reader@Example.COM ");
        dto.setPassword("StrongPassword123!");
        return dto;
    }

    private Authentication authenticated(BlogUser user) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(new BlogUserDetails(user));
        return authentication;
    }

    private BlogUser user(Long id, String email, BlogUserStatus status, Integer passwordVersion) {
        BlogUser user = new BlogUser();
        user.setId(id);
        user.setEmail(email);
        user.setPassword("$2a$10$stored-password-hash");
        user.setNickname("小读者");
        user.setStatus(status.getValue());
        user.setPasswordVersion(passwordVersion);
        return user;
    }
}
