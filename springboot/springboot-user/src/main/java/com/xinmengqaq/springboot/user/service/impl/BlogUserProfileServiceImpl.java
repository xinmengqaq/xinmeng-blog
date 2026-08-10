package com.xinmengqaq.springboot.user.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.user.aop.BlogUserAction;
import com.xinmengqaq.springboot.user.aop.BlogUserOperation;
import com.xinmengqaq.springboot.user.aop.RequireCaptcha;
import com.xinmengqaq.springboot.user.dto.BlogUserPasswordChangeDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailCodeSendDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailChangeDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserProfileUpdateDTO;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import com.xinmengqaq.springboot.user.enums.BlogUserStatus;
import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import com.xinmengqaq.springboot.user.service.BlogUserEmailService;
import com.xinmengqaq.springboot.user.service.BlogUserProfileService;
import com.xinmengqaq.springboot.user.vo.BlogUserCancellationVO;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import jakarta.annotation.Resource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Locale;

@Service
public class BlogUserProfileServiceImpl implements BlogUserProfileService {

    @Resource
    private BlogUserMapper blogUserMapper;

    @Resource
    private BlogUserEmailService blogUserEmailService;

    @Resource
    private PasswordEncoder passwordEncoder;

    /**
     * 按当前认证用户 ID 查询个人资料并转换为公开 VO。
     *
     * @param userId 当前认证用户 ID
     * @return 不包含认证内部字段的用户资料
     */
    @Override
    public BlogUserVO getProfile(Long userId) {
        BlogUser user = blogUserMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        return BlogUserVO.from(user);
    }

    /**
     * 规范化并更新当前认证用户的昵称，避免请求修改其他资料字段。
     *
     * @param userId 当前认证用户 ID
     * @param profileUpdateDTO 仅包含昵称的资料修改请求
     * @return 更新后的用户资料
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    @BlogUserOperation(BlogUserAction.UPDATE_PROFILE)
    public BlogUserVO updateProfile(Long userId, BlogUserProfileUpdateDTO profileUpdateDTO) {
        String nickname = profileUpdateDTO.getNickname().strip();
        if (nickname.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "昵称不能为空");
        }
        if (nickname.length() > 50) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "昵称长度必须在1-50个字符之间");
        }

        BlogUser patch = new BlogUser();
        patch.setId(userId);
        patch.setNickname(nickname);
        if (blogUserMapper.updateById(patch) == 0) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        return getProfile(userId);
    }

    /**
     * 修改当前用户密码；先锁定用户，确保旧密码校验与更新属于同一串行事务。
     *
     * @param userId 当前认证用户 ID
     * @param dto 密码修改请求
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    @BlogUserOperation(BlogUserAction.CHANGE_PASSWORD)
    public void changePassword(Long userId, BlogUserPasswordChangeDTO dto) {
        BlogUser user = getEnabledUserForUpdate(userId);
        requireCurrentPassword(dto.getCurrentPassword(), user);
        if (passwordEncoder.matches(dto.getNewPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.CONFLICT, "新密码不能与当前密码相同");
        }

        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        user.setPasswordVersion(user.getPasswordVersion() + 1);
        updateLockedUser(user);
    }

    /**
     * 校验图形验证码、当前密码和新邮箱唯一性后发送换绑验证码。
     *
     * @param userId 当前认证用户 ID
     * @param dto 换绑邮箱发码请求
     * @param clientIp 客户端 IP
     */
    @RequireCaptcha
    @Override
    @BlogUserOperation(BlogUserAction.SEND_EMAIL_CHANGE_CODE)
    public void sendEmailChangeCode(Long userId, BlogUserEmailCodeSendDTO dto, String clientIp) {
        BlogUser user = blogUserMapper.selectById(userId);
        requireEnabled(user);
        requireCurrentPassword(dto.getCurrentPassword(), user);
        String newEmail = requireAvailableNewEmail(dto.getNewEmail(), user);

        blogUserEmailService.send(EmailCodePurpose.CHANGE_EMAIL, newEmail, clientIp);
    }

    /**
     * 锁定当前用户后重新校验换绑条件，更新邮箱并使全部旧 JWT 失效。
     *
     * @param userId 当前认证用户 ID
     * @param dto 换绑邮箱确认请求
     * @return 换绑后的公开用户资料
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    @BlogUserOperation(BlogUserAction.CHANGE_EMAIL)
    public BlogUserVO changeEmail(Long userId, BlogUserEmailChangeDTO dto) {
        BlogUser user = getEnabledUserForUpdate(userId);
        requireCurrentPassword(dto.getCurrentPassword(), user);
        String newEmail = requireAvailableNewEmail(dto.getNewEmail(), user);
        if (!blogUserEmailService.consume(EmailCodePurpose.CHANGE_EMAIL, newEmail, dto.getEmailCode())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "邮箱验证码错误");
        }

        user.setEmail(newEmail);
        user.setPasswordVersion(user.getPasswordVersion() + 1);
        updateLockedUser(user);
        return BlogUserVO.from(user);
    }

    /**
     * 锁定启用用户并进入七天待删除状态，使已有 JWT 立即失效。
     *
     * @param userId 当前认证用户 ID
     * @return 预计物理删除时间
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    @BlogUserOperation(BlogUserAction.CANCEL_ACCOUNT)
    public BlogUserCancellationVO cancelAccount(Long userId) {
        BlogUser user = getEnabledUserForUpdate(userId);
        OffsetDateTime deleteAt = OffsetDateTime.now().plusDays(7);
        user.setStatus(BlogUserStatus.PENDING_DELETION.getValue());
        user.setDeleteAt(deleteAt);
        user.setPasswordVersion(user.getPasswordVersion() + 1);
        updateLockedUser(user);
        return BlogUserCancellationVO.builder().deleteAt(deleteAt).build();
    }

    private BlogUser getEnabledUserForUpdate(Long userId) {
        BlogUser user = blogUserMapper.selectByIdForUpdate(userId);
        requireEnabled(user);
        return user;
    }

    private void requireEnabled(BlogUser user) {
        if (user == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        if (!BlogUserStatus.ENABLED.getValue().equals(user.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "当前账号状态不允许此操作");
        }
    }

    private void requireCurrentPassword(String currentPassword, BlogUser user) {
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "当前密码错误");
        }
    }

    private String requireAvailableNewEmail(String rawEmail, BlogUser user) {
        String newEmail = rawEmail.strip().toLowerCase(Locale.ROOT);
        if (newEmail.equals(user.getEmail())) {
            throw new BusinessException(ErrorCode.CONFLICT, "新邮箱不能与当前邮箱相同");
        }
        Long count = blogUserMapper.selectCount(
                new LambdaQueryWrapper<BlogUser>().eq(BlogUser::getEmail, newEmail));
        if (count != null && count > 0) {
            throw new BusinessException(ErrorCode.CONFLICT, "邮箱已被使用");
        }
        return newEmail;
    }

    private void updateLockedUser(BlogUser user) {
        if (blogUserMapper.updateById(user) != 1) {
            throw new BusinessException(ErrorCode.CONFLICT, "用户数据已发生变化，请重试");
        }
    }
}
