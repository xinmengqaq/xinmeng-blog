package com.xinmengqaq.springboot.user.aop;

import com.xinmengqaq.springboot.user.dto.AdminBlogUserStatusDTO;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 用户操作审计日志切面。
 */
@Aspect
@Component
@Order(1)
public class BlogUserOperationAspect {

    private static final Logger USER_OPERATION = LoggerFactory.getLogger("USER_OPERATION");

    /**
     * 执行目标 Service 方法，并在事务完成后记录成功或失败的操作日志。
     *
     * @param joinPoint 当前被拦截的方法调用
     * @param blogUserOperation 方法声明的操作动作
     * @return 目标方法原始返回值
     * @throws Throwable 目标方法抛出的原始异常
     */
    @Around("@annotation(blogUserOperation)")
    public Object record(ProceedingJoinPoint joinPoint, BlogUserOperation blogUserOperation) throws Throwable {
        BlogUserAction action = resolveAction(blogUserOperation.value(), joinPoint.getArgs());
        long start = System.nanoTime();
        try {
            Object result = joinPoint.proceed();
            write(action, joinPoint.getArgs(), result, true, null, start);
            return result;
        } catch (Throwable throwable) {
            write(action, joinPoint.getArgs(), null, false, throwable, start);
            throw throwable;
        }
    }

    /**
     * 按中文可读格式输出一条不含敏感参数的用户操作日志。
     *
     * @param action 已解析的操作动作
     * @param args 目标方法实参，仅用于提取安全的 ID
     * @param result 目标方法返回值，仅用于提取公开用户 ID
     * @param success 操作是否成功
     * @param throwable 失败时的异常；成功时为 {@code null}
     * @param start 操作开始的纳秒时间
     */
    private void write(BlogUserAction action, Object[] args, Object result, boolean success,
                       Throwable throwable, long start) {
        Long targetUserId = isAdminAction(action) ? firstLong(args) : null;
        Long userId = isAdminAction(action) ? null : currentUserId(args, result);
        StringBuilder message = new StringBuilder("用户操作：")
                .append(action.getDescription());
        appendId(message, "用户ID", userId);
        appendId(message, "管理员ID", currentAdminId());
        appendId(message, "目标用户ID", targetUserId);
        message.append("，结果=").append(success ? "成功" : "失败")
                .append("，耗时=").append((System.nanoTime() - start) / 1_000_000L).append("ms");
        if (throwable != null) {
            message.append("，异常=").append(throwable.getClass().getSimpleName());
        }
        USER_OPERATION.info(message.toString());
    }

    private void appendId(StringBuilder message, String label, Long id) {
        if (id != null) {
            message.append("，").append(label).append("=").append(id);
        }
    }

    /**
     * 将管理员状态变更细分为启用或禁用动作，其他动作保持原值。
     *
     * @param action 注解声明的动作
     * @param args 目标方法实参
     * @return 实际写入日志的动作
     */
    private BlogUserAction resolveAction(BlogUserAction action, Object[] args) {
        if (action != BlogUserAction.ADMIN_CHANGE_STATUS) {
            return action;
        }
        for (Object arg : args) {
            if (arg instanceof AdminBlogUserStatusDTO dto) {
                return BlogUserAction.fromAdminStatus(dto.getStatus());
            }
        }
        return action;
    }

    /**
     * 判断动作是否由管理员针对目标用户执行。
     *
     * @param action 待判断的操作动作
     * @return 管理员操作返回 {@code true}
     */
    private boolean isAdminAction(BlogUserAction action) {
        return action == BlogUserAction.ADMIN_CHANGE_STATUS
                || action == BlogUserAction.ADMIN_ENABLE_USER
                || action == BlogUserAction.ADMIN_DISABLE_USER
                || action == BlogUserAction.ADMIN_DELETE_USER;
    }

    /**
     * 优先从公开返回值或显式参数取得用户 ID，退出登录时再读取认证主体。
     *
     * @param args 目标方法实参
     * @param result 目标方法返回值
     * @return 可安全记录的用户 ID；无法取得时为 {@code null}
     */
    private Long currentUserId(Object[] args, Object result) {
        if (result instanceof BlogUserVO user) {
            return user.getId();
        }
        Long userId = firstLong(args);
        return userId != null ? userId : authenticatedUserId();
    }

    /**
     * 返回参数列表中的第一个 {@link Long} 类型 ID。
     *
     * @param args 目标方法实参
     * @return 第一个 Long 参数；不存在时为 {@code null}
     */
    private Long firstLong(Object[] args) {
        for (Object arg : args) {
            if (arg instanceof Long id) {
                return id;
            }
        }
        return null;
    }

    /**
     * 从当前 Spring Security 认证主体读取已认证的普通用户 ID。
     *
     * @return 认证主体中的用户 ID；主体不存在或名称不是数字时为 {@code null}
     */
    private Long authenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    /**
     * 从管理员 MVC 拦截器写入的请求属性中取得当前管理员 ID。
     *
     * @return 当前管理员 ID；非 Web 请求或属性缺失时为 {@code null}
     */
    private Long currentAdminId() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes requestAttributes) {
            Object adminId = requestAttributes.getRequest().getAttribute("adminId");
            if (adminId instanceof Long id) {
                return id;
            }
        }
        return null;
    }
}
