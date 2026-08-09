package com.xinmengqaq.springboot.interceptor;

import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.admin.entity.Admin;
import com.xinmengqaq.springboot.admin.mapper.AdminMapper;
import com.xinmengqaq.springboot.utils.JwtUtils;
import io.jsonwebtoken.JwtException;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Objects;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    /*
     * 笔记：[SpringMVC] HandlerInterceptor + preHandle + request.setAttribute
     * HandlerInterceptor 是 Spring MVC 拦截器接口，三个回调：preHandle（Controller 前）、postHandle（Controller 后）、afterCompletion（请求结束）。
     * preHandle 返回 boolean：true 放行继续走 Controller，false 中断链路直接返回。
     * 本项目不用返回 false 中断，而是直接抛 BusinessException，由全局异常处理器统一兜底返回 JSON，行为更可控。
     * request.setAttribute(key,value) 把数据塞进本次请求作用域，Controller 用 request.getAttribute(key) 取出，
     * 数据只在这一次请求内有效、请求结束即消失，适合拦截器向 Controller 传递当前登录 ID 这类临时信息。
     */

    @Resource
    private JwtUtils jwtUtils;

    @Resource
    private AdminMapper adminMapper;

    /**
     * 拦截器前置处理方法，用于验证请求的登录状态和权限
     * @param request 当前HTTP请求对象
     * @param response 当前HTTP响应对象
     * @param handler 请求处理的方法对象
     * @return 如果验证通过返回true，否则抛出异常
     * @throws BusinessException 当未登录、管理员不存在或登录过期时抛出业务异常
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // 从请求头中获取Authorization字段
        String authorization = request.getHeader("Authorization");

        // 检查Authorization是否存在且以"Bearer "开头
        if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "未登录");
        }

        // 提取token部分（去掉"Bearer "前缀）
        String token = authorization.substring(7).trim();
        // 检查token是否为空
        if (!StringUtils.hasText(token)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "未登录");
        }

        if (!"admin".equals(jwtUtils.getTokenType(token))) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "未登录");
        }

        // 从token中解析管理员ID和密码版本
        Long adminId = jwtUtils.getAdminId(token);
        Integer tokenPasswordVersion = jwtUtils.getPasswordVersion(token);

        // 根据ID查询管理员信息
        Admin admin = adminMapper.selectById(adminId);
        // 检查管理员是否存在
        if (admin == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "管理员不存在");
        }

        // 检查密码版本是否匹配
        if (!Objects.equals(tokenPasswordVersion, admin.getPasswordVersion())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "登录已过期，请重新登录");
        }

        // 将管理员ID存入请求属性中，以便后续处理使用
        request.setAttribute("adminId", adminId);
        return true;
    }
}
