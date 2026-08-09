package com.xinmengqaq.springboot.user.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.config.JwtProperties;
import com.xinmengqaq.springboot.user.aop.RequireCaptcha;
import com.xinmengqaq.springboot.user.config.BlogUserDetails;
import com.xinmengqaq.springboot.user.dto.BlogUserLoginDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRegisterDTO;
import com.xinmengqaq.springboot.user.dto.EmailCodeSendDTO;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import com.xinmengqaq.springboot.user.enums.BlogUserStatus;
import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import com.xinmengqaq.springboot.user.service.BlogUserAuthService;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import com.xinmengqaq.springboot.utils.JwtUtils;
import jakarta.annotation.Resource;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
public class BlogUserAuthServiceImpl implements BlogUserAuthService {

    private static final long REMEMBER_ME_SECONDS = 14 * 24 * 3600L;   // 14 天

    @Resource
    private BlogUserMapper blogUserMapper;

    @Resource
    private BlogUserEmailServiceImpl blogUserEmailService;

    @Resource
    private PasswordEncoder passwordEncoder;

    @Resource
    private AuthenticationManager authenticationManage;

    @Resource
    private JwtUtils jwtUtils;

    @Resource
    private JwtProperties jwtProperties;

    @Resource(name = "loginErrorCountCache")
    private Cache<String, AtomicInteger> loginErrorCountCache;

    @Resource(name = "loginLockdownCache" )
    private Cache<String, Boolean> loginLockdownCache;

    @Resource(name = "tokenBlacklistCache")
    private Cache<String, Boolean> tokenBlacklistCache;

    /**
     * 邮箱验证码创建
     * @param emailCodeSendDTO 邮箱验证码dto
     * @param clientIP 用户ip
     */
    @RequireCaptcha
    @Override
    public void sendRegisterEmailCode(EmailCodeSendDTO emailCodeSendDTO, String clientIP) {
        log.info("收到发送注册邮箱验证码请求，clientIp={}", clientIP);

        String email = getEmail(emailCodeSendDTO.getEmail());

        blogUserEmailService.send(EmailCodePurpose.REGISTER,email,clientIP);

        log.info("注册邮箱验证码发送流程完成，clientIp={}", clientIP);
    }

    /**
     * 注册方法
     * @param blogUserRegisterDTO 注册DTO
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void register(BlogUserRegisterDTO blogUserRegisterDTO) {
        log.info("收到用户注册请求");

        String email = getEmail(blogUserRegisterDTO.getEmail());

        boolean ok = blogUserEmailService.consume(EmailCodePurpose.REGISTER, email, blogUserRegisterDTO.getEmailCode());
        if (!ok) {
            log.warn("注册失败，邮箱验证码错误");
            throw new BusinessException(ErrorCode.PARAM_ERROR, "邮箱验证码错误");
        }

        String hashed = passwordEncoder.encode(blogUserRegisterDTO.getPassword());

        BlogUser user = new BlogUser();
        user.setEmail(email);
        user.setPassword(hashed);
        user.setNickname(blogUserRegisterDTO.getNickname());
        BlogUserStatus status = BlogUserStatus.ENABLED;
        user.setStatus(status.getValue());

        int rows = blogUserMapper.insert(user);
        if (rows != 1){
            log.error("注册失败，用户插入影响行数={}", rows);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR,"注册失败");
        }

        log.info("用户注册成功，userId={}, status={}", user.getId(), status.getDescription());
    }

    /**
     * 登录方法
     * @param dto 登录DTO
     * @return 用户VO
     */
    @Override
    public BlogUserVO login(BlogUserLoginDTO dto) {
        String email = dto.getEmail().strip().toLowerCase(Locale.ROOT);

        String cacheKey = "user:login-error:" + email;

        if (loginLockdownCache.getIfPresent(cacheKey) != null){
            log.warn("用户登录被拒，冷却中");
            throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS,"冷却中，请稍后再试");
        }

        UsernamePasswordAuthenticationToken unauth =
                new UsernamePasswordAuthenticationToken(email, dto.getPassword());
        Authentication authenticated;
        try {
            authenticated = authenticationManage.authenticate(unauth);
        }catch (AuthenticationException e) {
            // 邮箱不存在/密码错都到这里（UsernameNotFoundException 被默认隐藏成 BadCredentialsException）
            log.warn("用户登录失败，凭据错误");
            loginErrorCountCache.asMap().compute(cacheKey, (K, record) -> {
                if (record == null) {
                    record = new AtomicInteger(0);
                }
                int count = record.incrementAndGet();
                if (count >= 5) {
                    loginLockdownCache.put(cacheKey, true);
                }
                return record;
            });
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "邮箱或密码错误");
        }

        BlogUser user = ((BlogUserDetails) authenticated.getPrincipal()).getUser();

        String status = user.getStatus();
        if (BlogUserStatus.DISABLED.getValue().equals(status)) {
            log.warn("用户登录被拒，账号已禁用，userId={}", user.getId());
            throw new BusinessException(ErrorCode.FORBIDDEN, "账号已被禁用");
        }
        if (BlogUserStatus.PENDING_DELETION.getValue().equals(status)) {
            log.warn("用户登录被拒，账号待删除，userId={}", user.getId());
            throw new BusinessException(ErrorCode.CONFLICT, "账号正在注销，请选择恢复账号");
        }

        long expireSeconds = Boolean.TRUE.equals(dto.getRememberMe())
                ? REMEMBER_ME_SECONDS
                : jwtProperties.getExpireSeconds();
        String token = jwtUtils.createUserToken(user.getId(), user.getPasswordVersion(), expireSeconds);
        BlogUserVO vo = BlogUserVO.from(user);
        vo.setToken(token);

        log.info("用户登录成功，userId={}", user.getId());
        return vo;

    }

    /**
     * 退出登录，将当前 Token 的 jti 加入黑名单，使该 Token 立即失效
     * @param token 客户端携带的 Token
     */
    @Override
    public void logout(String token) {
        String jti = jwtUtils.parseToken(token).getId();
        tokenBlacklistCache.put(jti, true);
        log.info("用户退出登录，已将 Token 加入黑名单，jti={}", jti);
    }

    /**
     * 获取规范邮箱和检测是否有邮箱
     * @param emailCodeSendDTO 邮箱验证码DTO
     * @return 规范邮箱
     */
    private @NonNull String getEmail(String emailCodeSendDTO) {
        String email = emailCodeSendDTO.strip().toLowerCase(Locale.ROOT);
        Long count = blogUserMapper.selectCount(
                new LambdaQueryWrapper<BlogUser>().eq(BlogUser::getEmail, email));

        if (count != null && count > 0) {
            log.warn("邮箱已被占用，拒绝注册/发码");
            throw new BusinessException(ErrorCode.CONFLICT, "邮箱已被使用");
        }
        return email;
    }

}
