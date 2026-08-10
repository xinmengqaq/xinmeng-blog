package com.xinmengqaq.springboot.user.controller;

import com.xinmengqaq.springboot.common.Result;
import cn.hutool.extra.servlet.JakartaServletUtil;
import com.xinmengqaq.springboot.user.dto.BlogUserPasswordChangeDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailCodeSendDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailChangeDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserProfileUpdateDTO;
import com.xinmengqaq.springboot.user.service.BlogUserProfileService;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@Slf4j
@Tag(name = "用户模块/个人资料", description = "当前登录用户的个人资料查询和昵称修改接口")
@RestController
@RequestMapping("/api/user")
public class BlogUserProfileController {

    @Resource
    private BlogUserProfileService blogUserProfileService;

    /**
     * 获取当前 JWT 认证主体对应的个人资料。
     *
     * @param principal Spring Security 注入的当前认证主体
     * @return 统一响应中的公开用户资料
     */
    @Operation(summary = "获取当前用户资料")
    @GetMapping("/profile")
    public Result getProfile(Principal principal) {
        Long userId = Long.valueOf(principal.getName());
        log.info("收到获取用户资料请求，userId={}", userId);
        return Result.success(blogUserProfileService.getProfile(userId));
    }

    /**
     * 修改当前 JWT 认证主体的昵称。
     *
     * @param principal Spring Security 注入的当前认证主体
     * @param profileUpdateDTO 昵称修改请求
     * @return 统一响应中的更新后用户资料
     */
    @Operation(summary = "修改当前用户昵称")
    @PutMapping("/profile")
    public Result updateProfile(Principal principal, @Valid @RequestBody BlogUserProfileUpdateDTO profileUpdateDTO) {
        Long userId = Long.valueOf(principal.getName());
        log.info("收到修改用户资料请求，userId={}", userId);
        BlogUserVO profile = blogUserProfileService.updateProfile(userId, profileUpdateDTO);
        Result result = Result.success(profile);
        result.setMsg("资料修改成功");
        return result;
    }

    /**
     * 修改当前用户密码并使已有用户 JWT 全部失效。
     *
     * @param principal 当前认证主体
     * @param dto 密码修改请求
     * @return 密码修改结果
     */
    @Operation(summary = "修改用户密码", description = "成功后所有旧用户 JWT 失效")
    @PatchMapping("/profile/password")
    public Result changePassword(Principal principal, @Valid @RequestBody BlogUserPasswordChangeDTO dto) {
        Long userId = Long.valueOf(principal.getName());
        blogUserProfileService.changePassword(userId, dto);
        Result result = Result.success();
        result.setMsg("密码修改成功");
        return result;
    }

    /**
     * 校验当前密码和图形验证码后发送新邮箱验证码。
     *
     * @param principal 当前认证主体
     * @param dto 换绑邮箱发码请求
     * @param request 当前请求
     * @return 发码结果
     */
    @Operation(summary = "发送修改邮箱验证码")
    @PostMapping("/profile/email-code")
    public Result sendEmailChangeCode(Principal principal,
                                      @Valid @RequestBody BlogUserEmailCodeSendDTO dto,
                                      HttpServletRequest request) {
        Long userId = Long.valueOf(principal.getName());
        String clientIp = JakartaServletUtil.getClientIP(request);
        blogUserProfileService.sendEmailChangeCode(userId, dto, clientIp);
        Result result = Result.success();
        result.setMsg("验证码已发送");
        return result;
    }

    /**
     * 换绑当前用户登录邮箱并使已有用户 JWT 全部失效。
     *
     * @param principal 当前认证主体
     * @param dto 换绑邮箱确认请求
     * @return 更新后的公开用户资料
     */
    @Operation(summary = "修改登录邮箱", description = "成功后所有旧用户 JWT 失效")
    @PatchMapping("/profile/email")
    public Result changeEmail(Principal principal, @Valid @RequestBody BlogUserEmailChangeDTO dto) {
        Long userId = Long.valueOf(principal.getName());
        BlogUserVO profile = blogUserProfileService.changeEmail(userId, dto);
        Result result = Result.success(profile);
        result.setMsg("邮箱修改成功，请重新登录");
        return result;
    }

    /**
     * 将当前启用账号置为七天待删除状态。
     *
     * @param principal 当前认证主体
     * @return 预计物理删除时间
     */
    @Operation(summary = "申请注销账号", description = "账号进入七天待删除状态并使旧 JWT 失效")
    @PostMapping("/account/cancel")
    public Result cancelAccount(Principal principal) {
        Long userId = Long.valueOf(principal.getName());
        Result result = Result.success(blogUserProfileService.cancelAccount(userId));
        result.setMsg("账号已进入 7 天待删除状态");
        return result;
    }
}
