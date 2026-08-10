package com.xinmengqaq.springboot.user.controller;

import com.xinmengqaq.springboot.common.exception.GlobalExceptionHandler;
import com.xinmengqaq.springboot.user.dto.BlogUserProfileUpdateDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserPasswordChangeDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailCodeSendDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailChangeDTO;
import com.xinmengqaq.springboot.user.service.BlogUserProfileService;
import com.xinmengqaq.springboot.user.vo.BlogUserCancellationVO;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.security.Principal;
import java.time.OffsetDateTime;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BlogUserProfileControllerTest {

    private static final Principal CURRENT_USER = () -> "12";

    @Mock
    private BlogUserProfileService profileService;

    @InjectMocks
    private BlogUserProfileController profileController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(profileController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("获取资料会使用认证主体中的 userId，并且不返回敏感字段")
    void getProfileUsesCurrentPrincipalAndReturnsPublicView() throws Exception {
        when(profileService.getProfile(12L)).thenReturn(profile("小读者"));

        mockMvc.perform(get("/api/user/profile").principal(CURRENT_USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.id").value(12))
                .andExpect(jsonPath("$.data.email").value("reader@example.com"))
                .andExpect(jsonPath("$.data.nickname").value("小读者"))
                .andExpect(jsonPath("$.data.avatar").value("/files/avatar/reader.png"))
                .andExpect(jsonPath("$.data.token").doesNotExist())
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.passwordVersion").doesNotExist())
                .andExpect(jsonPath("$.data.status").doesNotExist());

        verify(profileService).getProfile(12L);
    }

    @Test
    @DisplayName("修改资料会使用认证主体中的 userId 并返回更新后的公开资料")
    void updateProfileUsesCurrentPrincipalAndReturnsUpdatedView() throws Exception {
        when(profileService.updateProfile(org.mockito.ArgumentMatchers.eq(12L), any()))
                .thenReturn(profile("新的昵称"));

        mockMvc.perform(put("/api/user/profile")
                        .principal(CURRENT_USER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  \"nickname\": \"新的昵称\"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.msg").value("资料修改成功"))
                .andExpect(jsonPath("$.data.id").value(12))
                .andExpect(jsonPath("$.data.nickname").value("新的昵称"))
                .andExpect(jsonPath("$.data.token").doesNotExist())
                .andExpect(jsonPath("$.data.password").doesNotExist());

        ArgumentCaptor<BlogUserProfileUpdateDTO> captor = ArgumentCaptor.forClass(BlogUserProfileUpdateDTO.class);
        verify(profileService).updateProfile(org.mockito.ArgumentMatchers.eq(12L), captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getNickname()).isEqualTo("新的昵称");
    }

    @Test
    @DisplayName("空白昵称会在 Controller 参数校验阶段被拒绝且不进入 Service")
    void updateProfileRejectsBlankNicknameBeforeCallingService() throws Exception {
        mockMvc.perform(put("/api/user/profile")
                        .principal(CURRENT_USER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  \"nickname\": \"   \"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("400"))
                .andExpect(jsonPath("$.data").value(nullValue()));

        verifyNoInteractions(profileService);
    }

    @Test
    @DisplayName("修改密码使用认证主体并返回重新登录前的成功结果")
    void changePasswordUsesCurrentPrincipal() throws Exception {
        mockMvc.perform(patch("/api/user/profile/password")
                        .principal(CURRENT_USER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "OldPassword123!",
                                  "newPassword": "NewPassword456!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("密码修改成功"));

        verify(profileService).changePassword(org.mockito.ArgumentMatchers.eq(12L),
                any(BlogUserPasswordChangeDTO.class));
    }

    @Test
    @DisplayName("修改邮箱成功返回新邮箱并使旧凭证失效")
    void changeEmailUsesCurrentPrincipalAndReturnsUpdatedProfile() throws Exception {
        when(profileService.changeEmail(org.mockito.ArgumentMatchers.eq(12L), any()))
                .thenReturn(BlogUserVO.builder().id(12L).email("new-reader@example.com").build());

        mockMvc.perform(patch("/api/user/profile/email")
                        .principal(CURRENT_USER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "OldPassword123!",
                                  "newEmail": "new-reader@example.com",
                                  "emailCode": "381642"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("邮箱修改成功，请重新登录"))
                .andExpect(jsonPath("$.data.email").value("new-reader@example.com"));

        verify(profileService).changeEmail(org.mockito.ArgumentMatchers.eq(12L),
                any(BlogUserEmailChangeDTO.class));
    }

    @Test
    @DisplayName("注销账号返回七天恢复期限")
    void cancelAccountReturnsDeletionDeadline() throws Exception {
        OffsetDateTime deleteAt = OffsetDateTime.parse("2026-08-16T18:00:00+08:00");
        when(profileService.cancelAccount(12L)).thenReturn(BlogUserCancellationVO.builder().deleteAt(deleteAt).build());

        mockMvc.perform(post("/api/user/account/cancel").principal(CURRENT_USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("账号已进入 7 天待删除状态"))
                .andExpect(jsonPath("$.data.deleteAt").value("2026-08-16T18:00:00+08:00"));

        verify(profileService).cancelAccount(12L);
    }

    private BlogUserVO profile(String nickname) {
        return BlogUserVO.builder()
                .id(12L)
                .email("reader@example.com")
                .nickname(nickname)
                .avatar("/files/avatar/reader.png")
                .build();
    }
}
