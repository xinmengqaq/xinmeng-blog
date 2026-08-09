package com.xinmengqaq.springboot.user.aop;


import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.user.service.BlogUserCaptchaService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Slf4j
@Aspect
@Component
public class BlogUserCaptchaAspec {

    @Resource
    private BlogUserCaptchaService blogUserCaptchaService;

    @Before("@annotation(com.xinmengqaq.springboot.user.aop.RequireCaptcha)")
    public void verify(JoinPoint joinPoint) {
        // 1. 遍历方法参数，找到实现了 CaptchaCarrier 的参数
        CaptchaCarrier carrier = null;
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof CaptchaCarrier c) {
                carrier = c;
                break;
            }
        }

        // 2. 没找到携带验证码的参数，说明方法签名有问题
        if (carrier == null) {
            log.error("图形验证码切面未找到 CaptchaCarrier 参数，方法={}", joinPoint.getSignature().getName());
            throw new BusinessException(ErrorCode.PARAM_ERROR, "验证码参数缺失");
        }

        // 3. 调用 consume 校验图形验证码
        boolean valid = blogUserCaptchaService.consume(
                carrier.getCaptchaId(),
                carrier.getCaptchaCode()
        );

        // 4. 校验失败抛异常，目标方法不会执行
        if (!valid) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "图形验证码错误");
        }

        // 校验通过，@Before 正常结束，目标方法继续执行
    }
}
