package com.xinmengqaq.springboot.user.service.impl;

import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.user.dto.BlogUserProfileUpdateDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserPasswordChangeDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailCodeSendDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailChangeDTO;
import com.xinmengqaq.springboot.user.enums.BlogUserStatus;
import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;
import com.xinmengqaq.springboot.user.vo.BlogUserCancellationVO;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogUserProfileServiceImplTest {

    @Mock
    private BlogUserMapper blogUserMapper;

    @Mock
    private BlogUserEmailServiceImpl emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private BlogUserProfileServiceImpl profileService;

    @Test
    @DisplayName("读取资料时返回当前用户公开字段，不暴露认证字段")
    void getProfileMapsCurrentUserToPublicView() {
        when(blogUserMapper.selectById(12L)).thenReturn(user(12L, "小读者"));

        BlogUserVO profile = profileService.getProfile(12L);

        assertThat(profile.getId()).isEqualTo(12L);
        assertThat(profile.getEmail()).isEqualTo("reader@example.com");
        assertThat(profile.getNickname()).isEqualTo("小读者");
        assertThat(profile.getAvatar()).isEqualTo("/files/avatar/reader.png");
        assertThat(profile.getToken()).isNull();
        verify(blogUserMapper).selectById(12L);
    }

    @Test
    @DisplayName("读取不存在的用户资料时返回用户不存在")
    void getProfileRejectsMissingUser() {
        when(blogUserMapper.selectById(12L)).thenReturn(null);

        assertThatThrownBy(() -> profileService.getProfile(12L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("用户不存在");
                });
    }

    @Test
    @DisplayName("修改资料会去除昵称首尾空格，并且只提交 ID 和昵称补丁")
    void updateProfileNormalizesNicknameAndUpdatesOnlyNickname() {
        when(blogUserMapper.updateById(any(BlogUser.class))).thenReturn(1);
        when(blogUserMapper.selectById(12L)).thenReturn(user(12L, "新的昵称"));

        BlogUserVO profile = profileService.updateProfile(12L, updateDTO("  新的昵称  "));

        ArgumentCaptor<BlogUser> patchCaptor = ArgumentCaptor.forClass(BlogUser.class);
        verify(blogUserMapper).updateById(patchCaptor.capture());
        BlogUser patch = patchCaptor.getValue();
        assertThat(patch.getId()).isEqualTo(12L);
        assertThat(patch.getNickname()).isEqualTo("新的昵称");
        assertThat(patch.getEmail()).isNull();
        assertThat(patch.getPassword()).isNull();
        assertThat(patch.getAvatar()).isNull();
        assertThat(patch.getStatus()).isNull();
        assertThat(patch.getPasswordVersion()).isNull();
        assertThat(patch.getVersion()).isNull();
        assertThat(profile.getNickname()).isEqualTo("新的昵称");
        assertThat(profile.getEmail()).isEqualTo("reader@example.com");
        assertThat(profile.getToken()).isNull();
        verify(blogUserMapper).selectById(12L);
    }

    @Test
    @DisplayName("昵称去除首尾空格后为空时不访问数据库")
    void updateProfileRejectsNicknameThatBecomesBlank() {
        assertThatThrownBy(() -> profileService.updateProfile(12L, updateDTO("  \t  ")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.PARAM_ERROR.getCode());
                    assertThat(exception.getMessage()).isEqualTo("昵称不能为空");
                });

        verifyNoInteractions(blogUserMapper);
    }

    @Test
    @DisplayName("昵称去除首尾空格后超过五十个字符时不访问数据库")
    void updateProfileRejectsNicknameLongerThanFiftyCharactersAfterStripping() {
        assertThatThrownBy(() -> profileService.updateProfile(12L, updateDTO(" " + "读".repeat(51) + " ")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.PARAM_ERROR.getCode());
                    assertThat(exception.getMessage()).isEqualTo("昵称长度必须在1-50个字符之间");
                });

        verifyNoInteractions(blogUserMapper);
    }

    @Test
    @DisplayName("昵称更新影响零行时返回用户不存在")
    void updateProfileRejectsMissingUserWhenNoRowIsUpdated() {
        when(blogUserMapper.updateById(any(BlogUser.class))).thenReturn(0);

        assertThatThrownBy(() -> profileService.updateProfile(12L, updateDTO("新的昵称")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("用户不存在");
                });

        verify(blogUserMapper).updateById(any(BlogUser.class));
        verifyNoMoreInteractions(blogUserMapper);
    }

    @Test
    @DisplayName("修改密码会先锁定用户并递增凭证版本")
    void changePasswordLocksUserAndInvalidatesTokens() {
        BlogUser user = user(12L, "小读者");
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user);
        when(passwordEncoder.matches("OldPassword123!", user.getPassword())).thenReturn(true);
        when(passwordEncoder.matches("NewPassword456!", user.getPassword())).thenReturn(false);
        when(passwordEncoder.encode("NewPassword456!")).thenReturn("encoded-new-password");
        when(blogUserMapper.updateById(user)).thenReturn(1);

        profileService.changePassword(12L, passwordChangeDTO());

        assertThat(user.getPassword()).isEqualTo("encoded-new-password");
        assertThat(user.getPasswordVersion()).isEqualTo(4);
        verify(blogUserMapper).selectByIdForUpdate(12L);
    }

    @Test
    @DisplayName("发送换邮箱验证码会校验当前密码、新邮箱唯一性后发送指定用途验证码")
    void sendEmailChangeCodeChecksCredentialsAndUniqueness() {
        BlogUser user = user(12L, "小读者");
        when(blogUserMapper.selectById(12L)).thenReturn(user);
        when(passwordEncoder.matches("OldPassword123!", user.getPassword())).thenReturn(true);
        when(blogUserMapper.selectCount(any())).thenReturn(0L);

        profileService.sendEmailChangeCode(12L, emailCodeSendDTO(), "203.0.113.10");

        verify(emailService).send(EmailCodePurpose.CHANGE_EMAIL, "new-reader@example.com", "203.0.113.10");
    }

    @Test
    @DisplayName("换绑邮箱会锁定当前用户并递增凭证版本使旧 JWT 失效")
    void changeEmailLocksUserAndInvalidatesTokens() {
        BlogUser user = user(12L, "小读者");
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user);
        when(passwordEncoder.matches("OldPassword123!", user.getPassword())).thenReturn(true);
        when(blogUserMapper.selectCount(any())).thenReturn(0L);
        when(emailService.consume(EmailCodePurpose.CHANGE_EMAIL, "new-reader@example.com", "381642"))
                .thenReturn(true);
        when(blogUserMapper.updateById(user)).thenReturn(1);

        BlogUserVO result = profileService.changeEmail(12L, emailChangeDTO());

        assertThat(user.getEmail()).isEqualTo("new-reader@example.com");
        assertThat(user.getPasswordVersion()).isEqualTo(4);
        assertThat(result.getEmail()).isEqualTo("new-reader@example.com");
        verify(blogUserMapper).selectByIdForUpdate(12L);
    }

    @Test
    @DisplayName("注销账号会锁定启用用户并设置七天后的删除时间")
    void cancelAccountLocksEnabledUserAndStartsDeletionWindow() {
        BlogUser user = user(12L, "小读者");
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user);
        when(blogUserMapper.updateById(user)).thenReturn(1);

        OffsetDateTime before = OffsetDateTime.now().plusDays(7).minusSeconds(1);
        BlogUserCancellationVO result = profileService.cancelAccount(12L);
        OffsetDateTime after = OffsetDateTime.now().plusDays(7).plusSeconds(1);

        assertThat(user.getStatus()).isEqualTo(BlogUserStatus.PENDING_DELETION.getValue());
        assertThat(user.getPasswordVersion()).isEqualTo(4);
        assertThat(result.getDeleteAt()).isBetween(before, after);
        verify(blogUserMapper).selectByIdForUpdate(12L);
    }

    private BlogUserProfileUpdateDTO updateDTO(String nickname) {
        BlogUserProfileUpdateDTO dto = new BlogUserProfileUpdateDTO();
        dto.setNickname(nickname);
        return dto;
    }

    private BlogUser user(Long id, String nickname) {
        BlogUser user = new BlogUser();
        user.setId(id);
        user.setEmail("reader@example.com");
        user.setPassword("$2a$10$stored-password-hash");
        user.setNickname(nickname);
        user.setAvatar("/files/avatar/reader.png");
        user.setStatus("enabled");
        user.setPasswordVersion(3);
        user.setVersion(7);
        return user;
    }

    private BlogUserPasswordChangeDTO passwordChangeDTO() {
        BlogUserPasswordChangeDTO dto = new BlogUserPasswordChangeDTO();
        dto.setCurrentPassword("OldPassword123!");
        dto.setNewPassword("NewPassword456!");
        return dto;
    }

    private BlogUserEmailCodeSendDTO emailCodeSendDTO() {
        BlogUserEmailCodeSendDTO dto = new BlogUserEmailCodeSendDTO();
        dto.setCurrentPassword("OldPassword123!");
        dto.setNewEmail(" New-Reader@Example.COM ");
        dto.setCaptchaId("captcha-id");
        dto.setCaptchaCode("A2B3");
        return dto;
    }

    private BlogUserEmailChangeDTO emailChangeDTO() {
        BlogUserEmailChangeDTO dto = new BlogUserEmailChangeDTO();
        dto.setCurrentPassword("OldPassword123!");
        dto.setNewEmail(" New-Reader@Example.COM ");
        dto.setEmailCode("381642");
        return dto;
    }
}
