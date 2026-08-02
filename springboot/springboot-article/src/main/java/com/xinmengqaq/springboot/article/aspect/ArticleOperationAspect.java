package com.xinmengqaq.springboot.article.aspect;

import com.xinmengqaq.springboot.article.aspect.annotation.ArticleOperation;
import com.xinmengqaq.springboot.article.aspect.enums.ArticleAction;
import com.xinmengqaq.springboot.common.PageResult;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 文章操作切面（第八阶段任务2：切点表达式 + 五种通知 + 自定义注解）。
 * 保留任务1 的 save @Around；新增四种通知与 @annotation 注解版 @Around。
 */
@Slf4j
@Component
@Aspect
@Order(1)
public class ArticleOperationAspect {


    /*
     * 笔记：[Spring] @Order 与切面排序
     * @Order 标在切面类上指定优先级，值小者优先级高，是外层通知："进入时"先执行，"退出时"后执行。
     * @Transactional 也是 AOP around advice（由 TransactionInterceptor 实现），默认 order=LOWEST_PRECEDENCE（最低优先级，最内层）。
     * 切面 @Order(1) 比事务小，包在事务外层：切面进入 -> 事务开启 -> 目标方法 -> 事务提交/回滚 -> 切面退出。
     * 这样异常时事务先回滚、异常再抛到切面，切面记 success=false 时事务已回滚，语义正确。
     * 像穿衣服，先穿的在最外层（外套），后穿的在最内层（内衣）；@Order 值小=先穿=外套，进出时先进后出，把内层事务整个包住。
     */

    /*
     * 笔记：[日志] 专用 Logger 与 LoggerFactory.getLogger
     * LoggerFactory.getLogger("ARTICLE_OPERATION") 按名字获取一个独立 Logger，名字是字符串而非类。
     * logback 按这个名字单独配置（任务5 加文件 appender、关 additivity），让文章行为日志走独立通道，不和业务 log 混在一起。
     * 像电台频道，名字是频道号，logback 按频道号决定这条日志输出到哪个 appender（控制台/文件）；
     * 业务 log 走"综合频道"，ARTICLE_OPERATION 走"文章频道"，互不串台。
     */
    private static final Logger ARTICLE_OPERATION = LoggerFactory.getLogger("ARTICLE_OPERATION");

    @Pointcut("execution(public * com.xinmengqaq.springboot.article.service.impl.ArticleServiceImpl.selectDetailById(..)) "
            + "|| execution(public * com.xinmengqaq.springboot.article.service.impl.ArticleServiceImpl.selectPage(..))")
    public void articleQuery() {
        /*
         * 笔记：[Spring] @Pointcut 与切点指示符
         * @Pointcut 把切点表达式定义成空方法，方法名即切点名，供其他通知用方法名引用，实现复用与组合（&& || !）。
         *   方法签名必须是 void 返回、空方法体；它本身不执行任何逻辑，只是切点的"名字载体"。
         * execution(修饰符? 返回类型 包.类.方法(参数类型))：按方法签名精确匹配；参数 (..) 任意个数任意类型、(*) 一个任意类型、() 无参。
         * within(包..*)：按类匹配，命中包下所有类的所有方法，不细到方法签名；和 execution 搭配可缩小范围。
         */
    }

    @Pointcut("execution(public * com.xinmengqaq.springboot.article.service.impl.ArticleServiceImpl.updateStatus(..))")
    public void articleStatusUpdate() {
    }

    @Before("articleQuery()")
    public void beforeQuery(JoinPoint jp) {
        /*
         * 笔记：[Spring] @Before 与 JoinPoint
         * @Before：目标方法执行前执行，不能阻止方法执行（要阻止得用 @Around 不调 proceed）。
         * JoinPoint：四种非环绕通知的参数，提供 getSignature()（方法签名）、getArgs()（实参数组）、getTarget()（目标对象）；
         *   不能 proceed，只有 @Around 的 ProceedingJoinPoint 才能 proceed 控制是否执行目标方法。
         */
        log.info("【前置】准备执行查询，方法={}", jp.getSignature().getName());
    }

    @After("articleQuery()")
    public void afterQuery(JoinPoint jp) {
        /*
         * 笔记：[Spring] @After 与通知执行顺序
         * @After：目标方法后执行，无论正常返回或抛异常都执行，相当于 finally 语义。
         * 同一方法被多个通知命中时的执行顺序（任务6 系统讲，这里先记现象）：
         *   正常返回：@Around前 -> @Before -> 目标方法 -> @AfterReturning -> @After -> @Around后。
         *   抛出异常：@Around前 -> @Before -> 目标方法 -> @AfterThrowing -> @After -> 异常继续向上抛。
         */
        log.info("【后置】查询执行结束（finally 语义，无论成功或异常都执行），方法={}", jp.getSignature().getName());
    }

    @AfterReturning(pointcut = "articleQuery()", returning = "result")
    public void afterReturningQuery(JoinPoint jp, Object result) {
        /*
         * 笔记：[Spring] @AfterReturning 与 returning 绑定
         * @AfterReturning：目标方法正常返回后执行；抛异常时不执行。
         * returning = "result" 把目标方法返回值绑定到通知参数 result；参数类型必须能兼容实际返回值，
         *   否则通知静默不执行（用 Object 可匹配所有返回值）。
         */
        long total = result instanceof PageResult<?> pr ? pr.getTotal() : -1L;
        log.info("【返回】查询正常返回，方法={}, 返回类型={}, total={}",
                jp.getSignature().getName(), result.getClass().getSimpleName(), total);
    }

    @AfterThrowing(pointcut = "articleStatusUpdate()", throwing = "ex")
    public void afterThrowingStatusUpdate(JoinPoint jp, Throwable ex) {
        /*
         * 笔记：[Spring] @AfterThrowing 与 throwing 绑定
         * @AfterThrowing：目标方法抛异常后执行；正常返回时不执行。
         * throwing = "ex" 把异常对象绑定到通知参数 ex；参数类型必须能兼容实际异常，否则通知不执行。
         * 它只观察不吞，异常照常向上传播给全局异常处理器；要捕获并改变异常得用 @Around 的 try-catch。
         */
        log.info("【异常】状态更新抛出异常，方法={}, 异常类型={}", jp.getSignature().getName(), ex.getClass().getSimpleName());
    }

    @Around("@annotation(articleOperation)")
    public Object aroundAnnotated(ProceedingJoinPoint pjp, ArticleOperation articleOperation) throws Throwable {
        /*
         * 笔记：[Spring] @annotation 指示符与注解绑定
         * @annotation(articleOperation) 命中"方法上标了 @ArticleOperation 注解"的连接点，并把注解对象绑定到通知参数 articleOperation。
         *   参数名必须和切点里的名字完全一致，切面借此读注解属性（如 value()）。
         *   只匹配方法上的注解；类上的注解要用 @within，参数上的注解要用 @args。
         * 注解类必须 @Retention(RUNTIME)，否则运行时反射读不到，切面命中不了。
         */
        ArticleAction action = articleOperation.value();
        Long adminId = currentAdminId();
        Long articleId = extractArticleId(pjp.getArgs());
        long start = System.nanoTime();
        log.info("【切面·进入】action={}", action.getLabel());
        try {
            Object result = pjp.proceed();
            log.info("【切面·退出-成功】action={}", action.getLabel());
            ARTICLE_OPERATION.info("action={}, adminId={}, articleId={}, success=true, durationMs={}",
                    action.getLabel(), adminId, articleId, (System.nanoTime() - start) / 1_000_000L);
            return result;
        } catch (Throwable e) {
            log.info("【切面·退出-异常】action={}, error={}", action.getLabel(), e.getClass().getSimpleName());
            ARTICLE_OPERATION.info("action={}, adminId={}, articleId={}, success=false, durationMs={}, error={}",
                    action.getLabel(), adminId, articleId, (System.nanoTime() - start) / 1_000_000L, e.getClass().getSimpleName());
            throw e;
        }
    }

    @Around("execution(public * com.xinmengqaq.springboot.article.service.impl.ArticleServiceImpl.save(..))")
    public Object aroundSave(ProceedingJoinPoint pjp) throws Throwable {
        /*
         * 笔记：[Spring] getThis 与 getTarget
         * pjp.getThis()：返回代理对象（proxy），即 Spring 生成、外部注入的对象。
         * pjp.getTarget()：返回目标对象（target），即被代理的原始 ArticleServiceImpl 实例。
         * CGLIB 下 getThis() 类名含 $$EnhancerBySpringCGLIB$$；JDK 动态代理下类名是 com.sun.proxy.$ProxyXX。
         */
        log.info("【代理】代理对象类型={}, 目标对象类型={}",
                pjp.getThis().getClass().getName(), pjp.getTarget().getClass().getName());
        long start = System.nanoTime();
        Object result = pjp.proceed();
        long costMs = (System.nanoTime() - start) / 1_000_000L;
        log.info("文章新增完成，方法={}，耗时={}ms，文章ID={}", pjp.getSignature().getName(), costMs, result);
        return result;
    }

    @Around("execution(public * com.xinmengqaq.springboot.article.service.impl.ArticleServiceImpl.selectById(..))")
    public Object aroundSelectById(ProceedingJoinPoint pjp) throws Throwable {
        /*
         * 笔记：[Spring] 自调用不走代理
         * 同类内部用 this 调用另一个方法时，调用直接打到目标对象本身（this），不经过代理，切面不触发。
         * updateById 内部 return selectById(id) 是 this 自调用，这里的通知不会执行；
         * 只有外部经代理调用 selectById 才会触发通知。
         * 官方不推荐 AopContext.currentProxy() 和自注入绕行，应从设计上避免在需要切面的方法里自调用。
         */
        long start = System.nanoTime();
        Object result = pjp.proceed();
        long costMs = (System.nanoTime() - start) / 1_000_000L;
        log.info("【自调用验证】selectById 经代理调用，耗时={}ms", costMs);
        return result;
    }


    private Long extractArticleId(Object[] args) {
        for (Object arg : args) {
            if (arg instanceof Long l) {
                return l;
            }
        }
        return null;
    }

    private Long currentAdminId() {
        /*
         * 笔记：[SpringMVC] RequestContextHolder
         * RequestContextHolder 是 Spring Web 提供的请求上下文持有者，按线程绑定当前请求的 RequestAttributes。
         * Service 层拿不到方法参数里的 HttpServletRequest，用它可以在任意层取到当前请求，再 getAttribute 拿拦截器存的 adminId。
         * 像前台寄存柜，每个请求线程有自己的柜子（ThreadLocal），存着这次请求的 HttpServletRequest；谁来都能凭线程取到自己那柜。
         * 公开查询没经过 AuthInterceptor，adminId 不存在，返回 null，日志不伪造该字段。
         */
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes sra) {
            Object adminId = sra.getRequest().getAttribute("adminId");
            if (adminId instanceof Long l) {
                return l;
            }
        }
        return null;
    }
}