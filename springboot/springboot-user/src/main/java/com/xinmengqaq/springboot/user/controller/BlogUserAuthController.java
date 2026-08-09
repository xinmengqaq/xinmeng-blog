package com.xinmengqaq.springboot.user.controller;

import cn.hutool.extra.servlet.JakartaServletUtil;
import com.xinmengqaq.springboot.common.Result;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.user.dto.BlogUserLoginDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRegisterDTO;
import com.xinmengqaq.springboot.user.dto.EmailCodeSendDTO;
import com.xinmengqaq.springboot.user.service.BlogUserAuthService;
import com.xinmengqaq.springboot.user.service.BlogUserCaptchaService;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import com.xinmengqaq.springboot.user.vo.CaptchaVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@Tag(name = "用户模块/用户认证", description = "用户注册、登录、退出登录和验证码接口")
@RestController
@RequestMapping("/api/user")
public class BlogUserAuthController {

    @Resource
    private BlogUserCaptchaService captchaService;

    @Resource
    private BlogUserAuthService blogUserAuthService;

    @Operation(summary = "获取用户图形验证码", description = "注册、找回密码或修改邮箱发送邮件验证码前的人机校验")
    @GetMapping("/captcha")
    public Result captcha(HttpServletRequest request) {
        String clientIp = JakartaServletUtil.getClientIP(request);
        log.info("收到用户验证码请求，clientIp={}", clientIp);
        CaptchaVO captchaVO = captchaService.CreateCaptcha(clientIp);
        return Result.success(captchaVO);
    }

    @Operation(summary = "发送注册邮箱验证码", description = "校验图形验证码后向未注册邮箱发送注册验证码")
    @PostMapping("/register/email-code")
    public Result emailCode(@Valid @RequestBody EmailCodeSendDTO emailCodeSendDTO,
                            HttpServletRequest request){
        String clientIP = JakartaServletUtil.getClientIP(request);
        log.info("收到发送注册邮箱验证码请求，clientIp={}", clientIP);
        blogUserAuthService.sendRegisterEmailCode(emailCodeSendDTO,clientIP);

        Result result = Result.success();
        result.setMsg("验证码已发送");
        return result;
    }

    @Operation(summary = "用户注册", description = "校验邮箱验证码后创建启用用户，注册成功不自动登录")
    @PostMapping("/register")
    public Result register(@Valid @RequestBody BlogUserRegisterDTO blogUserRegisterDTO){
        log.info("收到用户注册请求");
        blogUserAuthService.register(blogUserRegisterDTO);
        Result result = Result.success();
        result.setMsg("注册成功");
        return result;
    }
    @Operation(summary = "用户登录", description = "校验邮箱密码后签发用户 JWT，勾选记住我时 Token 有效期为两周")
    @PostMapping("/login")
    public Result login(@Valid @RequestBody BlogUserLoginDTO blogUserLoginDTO, HttpServletRequest request) {
        String clientIp = JakartaServletUtil.getClientIP(request);
        log.info("收到用户登录请求，clientIp={}", clientIp);
        BlogUserVO vo = blogUserAuthService.login(blogUserLoginDTO);
        log.info("用户登录成功，userId={}", vo.getId());
        return Result.success(vo);
    }

    @Operation(summary = "用户退出登录", description = "将当前 Token 的 jti 加入黑名单使其立即失效，不影响其他设备")
    @PostMapping("/logout")
    public Result logout(HttpServletRequest request) {
        String clientIp = JakartaServletUtil.getClientIP(request);
        log.info("收到用户退出登录请求，clientIp={}", clientIp);
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "未登录或登录已过期");
        }
        blogUserAuthService.logout(header.substring(7));

        log.info("用户退出登录成功，clientIp={}", clientIp);
        Result result = Result.success();
        result.setMsg("退出成功");
        return result;
    }

    
}
