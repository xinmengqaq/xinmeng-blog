package com.xinmengqaq.springboot.interceptor;

import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.admin.entity.Admin;
import com.xinmengqaq.springboot.admin.mapper.AdminMapper;
import com.xinmengqaq.springboot.utils.JwtUtils;
import io.jsonwebtoken.MalformedJwtException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthInterceptorTest {

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private AdminMapper adminMapper;

    @InjectMocks
    private AuthInterceptor authInterceptor;

    private final MockHttpServletResponse response = new MockHttpServletResponse();

    @Test
    @DisplayName("未携带 Authorization 请求头时会拦截")
    void testPreHandleRejectsMissingAuthorization() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThatThrownBy(() -> authInterceptor.preHandle(request, response, new Object()))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED.getCode());
                    assertThat(exception.getMessage()).isEqualTo("未登录");
                });
    }

    @Test
    @DisplayName("Bearer 后没有 Token 时会拦截")
    void testPreHandleRejectsBlankBearerToken() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer ");

        assertThatThrownBy(() -> authInterceptor.preHandle(request, response, new Object()))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED.getCode());
                    assertThat(exception.getMessage()).isEqualTo("未登录");
                });
    }

    @Test
    @DisplayName("Token 非法时交给 JWT 异常链路处理")
    void testPreHandleRejectsInvalidToken() {
        MockHttpServletRequest request = authenticatedRequest("bad-token");
        when(jwtUtils.getAdminId("bad-token")).thenThrow(new MalformedJwtException("bad token"));

        assertThatThrownBy(() -> authInterceptor.preHandle(request, response, new Object()))
                .isInstanceOf(MalformedJwtException.class);
    }

    @Test
    @DisplayName("Token 对应管理员不存在时会拦截")
    void testPreHandleRejectsMissingAdmin() {
        MockHttpServletRequest request = authenticatedRequest("valid-token");
        when(jwtUtils.getAdminId("valid-token")).thenReturn(1L);
        when(jwtUtils.getPasswordVersion("valid-token")).thenReturn(2);
        when(adminMapper.selectById(1L)).thenReturn(null);

        assertThatThrownBy(() -> authInterceptor.preHandle(request, response, new Object()))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("管理员不存在");
                });
    }

    @Test
    @DisplayName("Token 密码版本和数据库不一致时会拦截")
    void testPreHandleRejectsPasswordVersionMismatch() {
        MockHttpServletRequest request = authenticatedRequest("old-token");
        when(jwtUtils.getAdminId("old-token")).thenReturn(1L);
        when(jwtUtils.getPasswordVersion("old-token")).thenReturn(1);
        when(adminMapper.selectById(1L)).thenReturn(admin(2));

        assertThatThrownBy(() -> authInterceptor.preHandle(request, response, new Object()))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.UNAUTHORIZED.getCode());
                    assertThat(exception.getMessage()).isEqualTo("登录已过期，请重新登录");
                });
    }

    @Test
    @DisplayName("Token 有效且密码版本一致时放行并写入当前管理员ID")
    void testPreHandlePassesAndSetsAdminIdWhenTokenValid() {
        MockHttpServletRequest request = authenticatedRequest("valid-token");
        when(jwtUtils.getAdminId("valid-token")).thenReturn(1L);
        when(jwtUtils.getPasswordVersion("valid-token")).thenReturn(2);
        when(adminMapper.selectById(1L)).thenReturn(admin(2));

        boolean result = authInterceptor.preHandle(request, response, new Object());

        assertThat(result).isTrue();
        assertThat(request.getAttribute("adminId")).isEqualTo(1L);
    }

    private MockHttpServletRequest authenticatedRequest(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }

    private Admin admin(Integer passwordVersion) {
        Admin admin = new Admin();
        admin.setId(1L);
        admin.setUsername("admin");
        admin.setPasswordVersion(passwordVersion);
        return admin;
    }
}

