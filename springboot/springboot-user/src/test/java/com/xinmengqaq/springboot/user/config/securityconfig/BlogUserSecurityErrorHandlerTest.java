package com.xinmengqaq.springboot.user.config.securityconfig;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

class BlogUserSecurityErrorHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("未认证访问用户受保护接口时返回统一的 401 JSON")
    void authenticationEntryPointWritesUnauthorizedJson() throws Exception {
        BlogUserAuthenticationEntryPoint entryPoint = new BlogUserAuthenticationEntryPoint();
        ReflectionTestUtils.setField(entryPoint, "objectMapper", objectMapper);
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(new MockHttpServletRequest(), response, new BadCredentialsException("invalid token"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat(objectMapper.readTree(response.getContentAsString()).path("code").asString()).isEqualTo("401");
        assertThat(objectMapper.readTree(response.getContentAsString()).path("msg").asString())
                .isEqualTo("登录已过期，请重新登录");
    }

    @Test
    @DisplayName("已认证但无权限访问时返回统一的 403 JSON")
    void accessDeniedHandlerWritesForbiddenJson() throws Exception {
        BlogUserAccessDeniedHandler accessDeniedHandler = new BlogUserAccessDeniedHandler();
        ReflectionTestUtils.setField(accessDeniedHandler, "objectMapper", objectMapper);
        MockHttpServletResponse response = new MockHttpServletResponse();

        accessDeniedHandler.handle(new MockHttpServletRequest(), response, new AccessDeniedException("forbidden"));

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat(objectMapper.readTree(response.getContentAsString()).path("code").asString()).isEqualTo("403");
        assertThat(objectMapper.readTree(response.getContentAsString()).path("msg").asString()).isEqualTo("无权限操作");
    }
}
