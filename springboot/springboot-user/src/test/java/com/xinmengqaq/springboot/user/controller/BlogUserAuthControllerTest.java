package com.xinmengqaq.springboot.user.controller;

import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.common.exception.GlobalExceptionHandler;
import com.xinmengqaq.springboot.user.dto.BlogUserLoginDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRegisterDTO;
import com.xinmengqaq.springboot.user.dto.EmailCodeSendDTO;
import com.xinmengqaq.springboot.user.service.BlogUserAuthService;
import com.xinmengqaq.springboot.user.service.BlogUserCaptchaService;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.stream.Stream;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BlogUserAuthControllerTest {

    @Mock
    private BlogUserCaptchaService captchaService;

    @Mock
    private BlogUserAuthService authService;

    @InjectMocks
    private BlogUserAuthController authController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("注册接口成功时只返回注册结果，不返回 Token 或自动登录状态")
    void registerReturnsSuccessWithoutLoginData() throws Exception {
        mockMvc.perform(post("/api/user/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerRequest("reader@example.com", "381642", "StrongPassword123!", "小读者")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.msg").value("注册成功"))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(jsonPath("$.token").doesNotExist());

        ArgumentCaptor<BlogUserRegisterDTO> captor = ArgumentCaptor.forClass(BlogUserRegisterDTO.class);
        verify(authService).register(captor.capture());
        BlogUserRegisterDTO dto = captor.getValue();
        org.assertj.core.api.Assertions.assertThat(dto.getEmail()).isEqualTo("reader@example.com");
        org.assertj.core.api.Assertions.assertThat(dto.getEmailCode()).isEqualTo("381642");
    }

    @Test
    @DisplayName("Nginx 转发的客户端 IP 会传入注册验证码发送服务")
    void sendRegisterEmailCodePassesForwardedClientIp() {
        EmailCodeSendDTO dto = emailCodeSendDTO();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "203.0.113.10");

        authController.emailCode(dto, request);

        verify(authService).sendRegisterEmailCode(dto, "203.0.113.10");
    }

    @Test
    @DisplayName("注册验证码发送接口会返回成功消息")
    void sendRegisterEmailCodeReturnsSuccessMessage() throws Exception {
        mockMvc.perform(post("/api/user/register/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "reader@example.com",
                                  "captchaId": "captcha-id",
                                  "captchaCode": "A2B3"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.msg").value("验证码已发送"))
                .andExpect(jsonPath("$.data").value(nullValue()));

        verify(authService).sendRegisterEmailCode(any(), anyString());
    }

    @Test
    @DisplayName("图形验证码失败时注册验证码发送接口返回参数错误")
    void sendRegisterEmailCodeReturnsCaptchaFailure() throws Exception {
        doThrow(new BusinessException(ErrorCode.PARAM_ERROR, "图形验证码错误"))
                .when(authService).sendRegisterEmailCode(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString());

        mockMvc.perform(post("/api/user/register/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "reader@example.com",
                                  "captchaId": "captcha-id",
                                  "captchaCode": "A2B3"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("400"))
                .andExpect(jsonPath("$.msg").value("图形验证码错误"));
    }

    @Test
    @DisplayName("登录接口成功时返回用户资料和 Token，未传记住我默认为 false")
    void loginReturnsUserDataAndDefaultsRememberMeToFalse() throws Exception {
        BlogUserVO vo = BlogUserVO.builder()
                .id(12L)
                .email("reader@example.com")
                .nickname("小读者")
                .avatar("/files/avatar/default.png")
                .token("user-jwt")
                .build();
        when(authService.login(any())).thenReturn(vo);

        mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "reader@example.com",
                                  "password": "StrongPassword123!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.id").value(12))
                .andExpect(jsonPath("$.data.email").value("reader@example.com"))
                .andExpect(jsonPath("$.data.token").value("user-jwt"))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.passwordVersion").doesNotExist());

        ArgumentCaptor<BlogUserLoginDTO> captor = ArgumentCaptor.forClass(BlogUserLoginDTO.class);
        verify(authService).login(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getRememberMe()).isFalse();
    }

    @Test
    @DisplayName("登录接口会将记住我参数原样交给认证服务")
    void loginPassesRememberMeToAuthenticationService() throws Exception {
        when(authService.login(any())).thenReturn(BlogUserVO.builder().id(12L).token("user-jwt").build());

        mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "reader@example.com",
                                  "password": "StrongPassword123!",
                                  "rememberMe": true
                                }
                                """))
                .andExpect(status().isOk());

        ArgumentCaptor<BlogUserLoginDTO> captor = ArgumentCaptor.forClass(BlogUserLoginDTO.class);
        verify(authService).login(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getRememberMe()).isTrue();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidLoginRequests")
    @DisplayName("登录接口会在进入 Service 前拒绝非法字段")
    void loginRejectsInvalidFieldsBeforeCallingService(String ignored, String requestBody) throws Exception {
        mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("400"));

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("退出登录会从 Bearer 请求头提取当前 Token 并返回成功消息")
    void logoutDelegatesCurrentBearerTokenAndReturnsSuccess() throws Exception {
        mockMvc.perform(post("/api/user/logout")
                        .header("Authorization", "Bearer current-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.msg").value("退出成功"))
                .andExpect(jsonPath("$.data").value(nullValue()));

        verify(authService).logout("current-token");
    }

    @Test
    @DisplayName("退出登录未携带 Bearer Token 时不会调用认证服务")
    void logoutRejectsMissingBearerTokenBeforeCallingService() throws Exception {
        mockMvc.perform(post("/api/user/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("401"))
                .andExpect(jsonPath("$.msg").value("未登录或登录已过期"));

        verifyNoInteractions(authService);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidRegisterRequests")
    @DisplayName("注册接口会在进入 Service 前拒绝所有非法注册字段")
    void registerRejectsInvalidFieldsBeforeCallingService(String ignored, String requestBody) throws Exception {
        mockMvc.perform(post("/api/user/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("400"));

        verifyNoInteractions(authService);
    }

    private EmailCodeSendDTO emailCodeSendDTO() {
        EmailCodeSendDTO dto = new EmailCodeSendDTO();
        dto.setEmail("reader@example.com");
        dto.setCaptchaId("captcha-id");
        dto.setCaptchaCode("A2B3");
        return dto;
    }

    private static Stream<Arguments> invalidRegisterRequests() {
        return Stream.of(
                Arguments.of("邮箱为空", registerRequest("", "381642", "StrongPassword123!", "小读者")),
                Arguments.of("邮箱超过 320 字符", registerRequest("a".repeat(310) + "@example.com", "381642", "StrongPassword123!", "小读者")),
                Arguments.of("邮箱格式错误", registerRequest("not-an-email", "381642", "StrongPassword123!", "小读者")),
                Arguments.of("邮箱验证码为空", registerRequest("reader@example.com", "", "StrongPassword123!", "小读者")),
                Arguments.of("邮箱验证码不是六码数字", registerRequest("reader@example.com", "ABC123", "StrongPassword123!", "小读者")),
                Arguments.of("密码少于八个字符", registerRequest("reader@example.com", "381642", "short", "小读者")),
                Arguments.of("密码超过六十四个字符", registerRequest("reader@example.com", "381642", "a".repeat(65), "小读者")),
                Arguments.of("密码 UTF-8 字节数超过 BCrypt 上限", registerRequest("reader@example.com", "381642", "密".repeat(25), "小读者")),
                Arguments.of("昵称为空", registerRequest("reader@example.com", "381642", "StrongPassword123!", "")),
                Arguments.of("昵称超过五十个字符", registerRequest("reader@example.com", "381642", "StrongPassword123!", "读".repeat(51)))
        );
    }

    private static Stream<Arguments> invalidLoginRequests() {
        return Stream.of(
                Arguments.of("邮箱为空", """
                        {
                          "email": "",
                          "password": "StrongPassword123!"
                        }
                        """),
                Arguments.of("邮箱格式错误", """
                        {
                          "email": "not-an-email",
                          "password": "StrongPassword123!"
                        }
                        """),
                Arguments.of("密码为空", """
                        {
                          "email": "reader@example.com",
                          "password": null
                        }
                        """),
                Arguments.of("密码少于八个字符", """
                        {
                          "email": "reader@example.com",
                          "password": "short"
                        }
                        """),
                Arguments.of("密码超过六十四个字符", """
                        {
                          "email": "reader@example.com",
                          "password": "%s"
                        }
                        """.formatted("a".repeat(65))),
                Arguments.of("记住我显式为空", """
                        {
                          "email": "reader@example.com",
                          "password": "StrongPassword123!",
                          "rememberMe": null
                        }
                        """)
        );
    }

    private static String registerRequest(String email, String emailCode, String password, String nickname) {
        return """
                {
                  "email": "%s",
                  "emailCode": "%s",
                  "password": "%s",
                  "nickname": "%s"
                }
                """.formatted(email, emailCode, password, nickname);
    }
}
