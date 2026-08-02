package com.xinmengqaq.springboot.article.aspect.annotation;

import com.xinmengqaq.springboot.article.aspect.enums.ArticleAction;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 文章操作标记注解。标在需要被切面拦截的 Service 方法上，
 * 切面通过 @annotation 命中并读取注解元数据。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ArticleOperation {

    /*
     * 笔记：[Spring] 自定义注解 + @annotation 精准标记
     * @Retention(RUNTIME)：注解保留到运行时，AOP 反射才能读到；默认 CLASS 保留不到运行时，切面命中不了。
     * @Target(METHOD)：限制只能标在方法上。
     * 切面用 @annotation(araticleOperation) 命中"方法上标了此注解"的连接点，并把注解对象绑定到通知参数。
     */
    ArticleAction value();
}
