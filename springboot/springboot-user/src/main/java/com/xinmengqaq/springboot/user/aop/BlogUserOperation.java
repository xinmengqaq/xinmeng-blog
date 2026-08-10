package com.xinmengqaq.springboot.user.aop;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标记需要记录用户操作日志的 Service 公开方法。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface BlogUserOperation {

    /**
     * 指定当前 Service 方法对应的审计动作。
     *
     * @return 用户操作日志的固定动作值
     */
    BlogUserAction value();
}
