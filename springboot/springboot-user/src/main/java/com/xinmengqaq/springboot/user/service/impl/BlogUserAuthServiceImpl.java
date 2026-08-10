package com.xinmengqaq.springboot.user.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.config.JwtProperties;
import com.xinmengqaq.springboot.user.aop.BlogUserAction;
import com.xinmengqaq.springboot.user.aop.BlogUserOperation;
import com.xinmengqaq.springboot.user.aop.RequireCaptcha;
import com.xinmengqaq.springboot.user.config.BlogUserDetails;
import com.xinmengqaq.springboot.user.dto.BlogUserLoginDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRegisterDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserPasswordResetDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRestoreDTO;
import com.xinmengqaq.springboot.user.dto.EmailCodeSendDTO;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import com.xinmengqaq.springboot.user.enums.BlogUserStatus;
import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import com.xinmengqaq.springboot.user.service.BlogUserAuthService;
import com.xinmengqaq.springboot.user.service.BlogUserEmailService;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class BlogUserAuthServiceImpl implements BlogUserAuthService {

    private static final long REMEMBER_ME_SECONDS = 14 * 24 * 3600L;   // 14 天

    @Resource
    private BlogUserMapper blogUserMapper;

    @Resource
    private BlogUserEmailService blogUserEmailService;

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
    @BlogUserOperation(BlogUserAction.SEND_REGISTER_EMAIL_CODE)
    @Override
    public void sendRegisterEmailCode(EmailCodeSendDTO emailCodeSendDTO, String clientIP) {
        String email = normalizeAvailableEmail(emailCodeSendDTO.getEmail());
        blogUserEmailService.send(EmailCodePurpose.REGISTER,email,clientIP);
    }

    /**
     * 注册方法
     * @param blogUserRegisterDTO 注册DTO
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    @BlogUserOperation(BlogUserAction.REGISTER)
    public void register(BlogUserRegisterDTO blogUserRegisterDTO) {
        String email = normalizeAvailableEmail(blogUserRegisterDTO.getEmail());

        boolean ok = blogUserEmailService.consume(EmailCodePurpose.REGISTER, email, blogUserRegisterDTO.getEmailCode());
        if (!ok) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "邮箱验证码错误");
        }

        String hashed = passwordEncoder.encode(blogUserRegisterDTO.getPassword());

        BlogUser user = new BlogUser();
        user.setEmail(email);
        user.setPassword(hashed);
        user.setNickname(blogUserRegisterDTO.getNickname());
        user.setStatus(BlogUserStatus.ENABLED.getValue());

        int rows = blogUserMapper.insert(user);
        if (rows != 1){
            throw new BusinessException(ErrorCode.SYSTEM_ERROR,"注册失败");
        }
    }

    /**
     * 登录方法
     * @param dto 登录DTO
     * @return 用户VO
     */
    @Override
    @BlogUserOperation(BlogUserAction.LOGIN)
    public BlogUserVO login(BlogUserLoginDTO dto) {
        String email = normalizeEmail(dto.getEmail());

        String cacheKey = "user:login-error:" + email;

        if (loginLockdownCache.getIfPresent(cacheKey) != null){
            throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS,"冷却中，请稍后再试");
        }

        UsernamePasswordAuthenticationToken unauth =
                new UsernamePasswordAuthenticationToken(email, dto.getPassword());
        Authentication authenticated;
        try {
            authenticated = authenticationManage.authenticate(unauth);
        }catch (AuthenticationException e) {
            // 邮箱不存在/密码错都到这里（UsernameNotFoundException 被默认隐藏成 BadCredentialsException）
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
            throw new BusinessException(ErrorCode.FORBIDDEN, "账号已被禁用");
        }
        if (BlogUserStatus.PENDING_DELETION.getValue().equals(status)) {
            throw new BusinessException(ErrorCode.CONFLICT, "账号正在注销，请选择恢复账号");
        }

        long expireSeconds = Boolean.TRUE.equals(dto.getRememberMe())
                ? REMEMBER_ME_SECONDS
                : jwtProperties.getExpireSeconds();
        String token = jwtUtils.createUserToken(user.getId(), user.getPasswordVersion(), expireSeconds);
        BlogUserVO vo = BlogUserVO.from(user);
        vo.setToken(token);

        return vo;

    }

    /**
     * 退出登录，将当前 Token 的 jti 加入黑名单，使该 Token 立即失效
     * @param token 客户端携带的 Token
     */
    @Override
    @BlogUserOperation(BlogUserAction.LOGOUT)
    public void logout(String token) {
        String jti = jwtUtils.parseToken(token).getId();
        tokenBlacklistCache.put(jti, true);
    }

    /**
     * 发送找回密码验证码；不存在的邮箱返回相同结果，避免泄露账号存在性。
     *
     * @param dto 邮箱和图形验证码
     * @param clientIp 客户端 IP
     */
    @RequireCaptcha
    @BlogUserOperation(BlogUserAction.SEND_PASSWORD_RESET_CODE)
    @Override
    public void sendPasswordResetCode(EmailCodeSendDTO dto, String clientIp) {
        String email = normalizeEmail(dto.getEmail());
        if (!emailExists(email)) {
            return;
        }
        blogUserEmailService.send(EmailCodePurpose.RESET_PASSWORD, email, clientIp);
    }

    /**
     * 通过邮箱验证码重置密码，并锁定用户防止并发凭据变更相互覆盖。
     *
     * @param dto 密码重置请求
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    @BlogUserOperation(BlogUserAction.RESET_PASSWORD)
    public void resetPassword(BlogUserPasswordResetDTO dto) {
        String email = normalizeEmail(dto.getEmail());
        BlogUser user = blogUserMapper.selectByEmailForUpdate(email);
        if (user == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "邮箱验证码错误或已过期");
        }
        if (!blogUserEmailService.consume(EmailCodePurpose.RESET_PASSWORD, email, dto.getEmailCode())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "邮箱验证码错误");
        }
        if (passwordEncoder.matches(dto.getNewPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.CONFLICT, "新密码不能与原密码相同");
        }

        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        user.setPasswordVersion(user.getPasswordVersion() + 1);
        updateLockedUser(user);
    }

    /**
     * 恢复仍在七天期限内的待删除账号，并使注销前凭证继续保持失效。
     *
     * @param dto 账号恢复请求
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    @BlogUserOperation(BlogUserAction.RESTORE_ACCOUNT)
    public void restoreAccount(BlogUserRestoreDTO dto) {
        String email = normalizeEmail(dto.getEmail());
        BlogUser user = blogUserMapper.selectByEmailForUpdate(email);
        OffsetDateTime now = OffsetDateTime.now();
        if (user == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        if (!BlogUserStatus.PENDING_DELETION.getValue().equals(user.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "当前账号状态不允许此操作");
        }
        if (user.getDeleteAt() == null || !user.getDeleteAt().isAfter(now)) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "邮箱或密码错误");
        }

        user.setStatus(BlogUserStatus.ENABLED.getValue());
        user.setDeleteAt(null);
        user.setPasswordVersion(user.getPasswordVersion() + 1);
        updateLockedUser(user);
        if (blogUserMapper.update(null, new UpdateWrapper<BlogUser>()
                .eq("id", user.getId())
                .set("delete_at", null)) != 1) {
            throw new BusinessException(ErrorCode.CONFLICT, "用户数据已发生变化，请重试");
        }
    }

    /**
     * 获取规范邮箱和检测是否有邮箱
     * @param emailCodeSendDTO 邮箱验证码DTO
     * @return 规范邮箱
     */
    private @NonNull String normalizeAvailableEmail(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        if (emailExists(email)) {
            throw new BusinessException(ErrorCode.CONFLICT, "邮箱已被使用");
        }
        return email;
    }

    private boolean emailExists(String email) {
        Long count = blogUserMapper.selectCount(
                new LambdaQueryWrapper<BlogUser>().eq(BlogUser::getEmail, email));
        return count != null && count > 0;
    }

    private String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private void updateLockedUser(BlogUser user) {
        if (blogUserMapper.updateById(user) != 1) {
            throw new BusinessException(ErrorCode.CONFLICT, "用户数据已发生变化，请重试");
        }
    }

}
