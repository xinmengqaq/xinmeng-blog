package com.xinmengqaq.springboot.admin.service.impl;

import cn.hutool.captcha.LineCaptcha;
import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.admin.config.AdminCaptchaConstants;
import com.xinmengqaq.springboot.admin.vo.AdminCaptchaVO;
import com.xinmengqaq.springboot.config.captcha.CaptchaCacheConfig;
import com.xinmengqaq.springboot.config.captcha.CaptchaFactory;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.admin.dto.AdminLoginDTO;
import com.xinmengqaq.springboot.admin.dto.AdminPasswordChangeDTO;
import com.xinmengqaq.springboot.admin.dto.AdminProfileUpdateDTO;
import com.xinmengqaq.springboot.admin.entity.Admin;
import com.xinmengqaq.springboot.admin.mapper.AdminMapper;
import com.xinmengqaq.springboot.utils.JwtUtils;
import com.xinmengqaq.springboot.admin.vo.AdminVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceImplTest {

    @Mock
    private AdminMapper adminMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private CaptchaFactory captchaFactory;

    @InjectMocks
    private AdminServiceImpl adminService;

    private Cache<String, String> captchaCache;

    @BeforeEach
    void setUp() {
        CaptchaCacheConfig cacheConfig = new CaptchaCacheConfig();
        captchaCache = cacheConfig.captchaCache();
        ReflectionTestUtils.setField(adminService, "captchaCache", captchaCache);
        ReflectionTestUtils.setField(adminService, "issueRateCache", cacheConfig.captchaIssueRateCache());
    }

    @Test
    @DisplayName("登录成功时返回管理员资料和 Token，不返回内部密码字段")
    void testLoginReturnsAdminProfileAndTokenWhenPasswordMatches() {
        Admin admin = admin();
        AdminLoginDTO dto = loginDTO("admin", "123456");
        when(adminMapper.selectByUsername("admin")).thenReturn(admin);
        when(passwordEncoder.matches("123456", "encoded-password")).thenReturn(true);
        when(jwtUtils.createToken(1L, "admin", 2)).thenReturn("jwt-token");

        AdminVO result = adminService.login(dto);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getUsername()).isEqualTo("admin");
        assertThat(result.getName()).isEqualTo("梦梦");
        assertThat(result.getRole()).isEqualTo("admin");
        assertThat(result.getAvatar()).isEqualTo("/files/avatar.png");
        assertThat(result.getToken()).isEqualTo("jwt-token");
    }

    @Test
    @DisplayName("登录时账号不存在会统一返回用户名或密码错误")
    void testLoginThrowsSameMessageWhenUsernameMissing() {
        AdminLoginDTO dto = loginDTO("missing", "123456");
        when(adminMapper.selectByUsername("missing")).thenReturn(null);

        assertThatThrownBy(() -> adminService.login(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED.getCode());
                    assertThat(exception.getMessage()).isEqualTo("用户名或密码错误");
                });
        verify(passwordEncoder, never()).matches(anyString(), anyString());
        verify(jwtUtils, never()).createToken(null, null, null);
    }

    @Test
    @DisplayName("登录时密码错误会统一返回用户名或密码错误")
    void testLoginThrowsSameMessageWhenPasswordWrong() {
        AdminLoginDTO dto = loginDTO("admin", "wrong-password");
        Admin admin = admin();
        when(adminMapper.selectByUsername("admin")).thenReturn(admin);
        when(passwordEncoder.matches("wrong-password", "encoded-password")).thenReturn(false);

        assertThatThrownBy(() -> adminService.login(dto))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED.getCode());
                    assertThat(exception.getMessage()).isEqualTo("用户名或密码错误");
                });
        verify(jwtUtils, never()).createToken(null, null, null);
    }

    @Test
    @DisplayName("获取当前管理员资料不会带登录 Token")
    void testGetCurrentAdminReturnsProfileWithoutToken() {
        when(adminMapper.selectById(1L)).thenReturn(admin());

        AdminVO result = adminService.getCurrentAdmin(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getUsername()).isEqualTo("admin");
        assertThat(result.getToken()).isNull();
    }

    @Test
    @DisplayName("刷新 Token 时使用数据库里的当前密码版本重新签发")
    void testRefreshTokenUsesCurrentPasswordVersion() {
        when(adminMapper.selectById(1L)).thenReturn(admin());
        when(jwtUtils.createToken(1L, "admin", 2)).thenReturn("new-token");

        String token = adminService.refreshToken(1L);

        assertThat(token).isEqualTo("new-token");
    }

    @Test
    @DisplayName("修改资料成功后返回更新后的管理员资料")
    void testUpdateProfileReturnsUpdatedAdmin() {
        Admin before = admin();
        Admin after = admin();
        after.setName("新名字");
        after.setAvatar("/files/new-avatar.png");
        AdminProfileUpdateDTO dto = new AdminProfileUpdateDTO();
        dto.setName("新名字");
        dto.setAvatar("/files/new-avatar.png");
        when(adminMapper.selectById(1L)).thenReturn(before, after);
        when(adminMapper.updateProfile(any(Admin.class))).thenReturn(1);

        AdminVO result = adminService.updateProfile(1L, dto);

        ArgumentCaptor<Admin> adminCaptor = ArgumentCaptor.forClass(Admin.class);
        verify(adminMapper).updateProfile(adminCaptor.capture());
        assertThat(adminCaptor.getValue().getId()).isEqualTo(1L);
        assertThat(adminCaptor.getValue().getName()).isEqualTo("新名字");
        assertThat(adminCaptor.getValue().getAvatar()).isEqualTo("/files/new-avatar.png");
        assertThat(result.getName()).isEqualTo("新名字");
        assertThat(result.getAvatar()).isEqualTo("/files/new-avatar.png");
        assertThat(result.getToken()).isNull();
    }

    @Test
    @DisplayName("修改密码时旧密码错误会拒绝更新")
    void testChangePasswordRejectsWrongOldPassword() {
        AdminPasswordChangeDTO dto = passwordChangeDTO("wrong-password", "new123456");
        when(adminMapper.selectByIdForUpdate(1L)).thenReturn(admin());
        when(passwordEncoder.matches("wrong-password", "encoded-password")).thenReturn(false);

        assertThatThrownBy(() -> adminService.changePassword(1L, dto))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.FORBIDDEN.getCode());
                    assertThat(exception.getMessage()).isEqualTo("旧密码错误");
                });
        verify(adminMapper, never()).changePassword(1L, "new-encoded-password");
    }

    @Test
    @DisplayName("修改密码成功时会加密新密码后交给 Mapper 更新")
    void testChangePasswordEncodesNewPasswordBeforeUpdate() {
        AdminPasswordChangeDTO dto = passwordChangeDTO("123456", "new123456");
        when(adminMapper.selectByIdForUpdate(1L)).thenReturn(admin());
        when(passwordEncoder.matches("123456", "encoded-password")).thenReturn(true);
        when(passwordEncoder.encode("new123456")).thenReturn("new-encoded-password");
        when(adminMapper.changePassword(1L, "new-encoded-password")).thenReturn(1);

        adminService.changePassword(1L, dto);

        verify(adminMapper).changePassword(1L, "new-encoded-password");
    }

    @Test
    @DisplayName("创建验证码使用公共工厂并返回管理员验证码 VO")
    void createCaptchaUsesSharedFactoryAndAdminVO() {
        LineCaptcha captcha = mock(LineCaptcha.class);
        when(captchaFactory.create()).thenReturn(captcha);
        when(captcha.getCode()).thenReturn("A2B3");
        when(captcha.getImageBase64()).thenReturn("image-base64");

        AdminCaptchaVO result = adminService.createCaptcha("203.0.113.10");

        assertThat(result.getCaptchaId()).isNotBlank();
        assertThat(result.getImageBase64()).isEqualTo("image-base64");
        verify(captchaFactory).create();
        assertThat(captchaCache.getIfPresent(AdminCaptchaConstants.CACHE_KEY_PREFIX + result.getCaptchaId())).isEqualTo("A2B3");
    }

    private Admin admin() {
        Admin admin = new Admin();
        admin.setId(1L);
        admin.setUsername("admin");
        admin.setPassword("encoded-password");
        admin.setName("梦梦");
        admin.setRole("admin");
        admin.setAvatar("/files/avatar.png");
        admin.setPasswordVersion(2);
        return admin;
    }

    private AdminLoginDTO loginDTO(String username, String password) {
        AdminLoginDTO dto = new AdminLoginDTO();
        dto.setUsername(username);
        dto.setPassword(password);
        dto.setCaptchaID(UUID.randomUUID().toString());
        dto.setCaptchaCode("a2b3");
        return dto;
    }

    private AdminPasswordChangeDTO passwordChangeDTO(String oldPassword, String newPassword) {
        AdminPasswordChangeDTO dto = new AdminPasswordChangeDTO();
        dto.setOldPassword(oldPassword);
        dto.setNewPassword(newPassword);
        return dto;
    }
}
