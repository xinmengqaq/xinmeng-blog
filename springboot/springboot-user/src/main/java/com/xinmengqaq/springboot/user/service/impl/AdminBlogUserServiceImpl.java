package com.xinmengqaq.springboot.user.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xinmengqaq.springboot.common.PageResult;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.user.aop.BlogUserAction;
import com.xinmengqaq.springboot.user.aop.BlogUserOperation;
import com.xinmengqaq.springboot.user.dto.AdminBlogUserPageQueryDTO;
import com.xinmengqaq.springboot.user.dto.AdminBlogUserStatusDTO;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import com.xinmengqaq.springboot.user.enums.BlogUserStatus;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import com.xinmengqaq.springboot.user.service.AdminBlogUserService;
import com.xinmengqaq.springboot.user.vo.AdminBlogUserVO;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * 管理员管理普通用户的业务实现。
 */
@Service
public class AdminBlogUserServiceImpl implements AdminBlogUserService {

    @Resource
    private BlogUserMapper blogUserMapper;

    @Override
    public PageResult<AdminBlogUserVO> pageUsers(AdminBlogUserPageQueryDTO dto) {
        LambdaQueryWrapper<BlogUser> query = new LambdaQueryWrapper<>();
        String keyword = normalizeKeyword(dto.getKeyword());
        if (StringUtils.hasText(keyword)) {
            query.and(wrapper -> wrapper.like(BlogUser::getEmail, keyword)
                    .or()
                    .like(BlogUser::getNickname, keyword));
        }
        if (StringUtils.hasText(dto.getStatus())) {
            query.eq(BlogUser::getStatus, dto.getStatus());
        }
        query.orderByDesc(BlogUser::getCreatedAt)
                .orderByDesc(BlogUser::getId);

        Page<BlogUser> page = blogUserMapper.selectPage(new Page<>(dto.getPage(), dto.getSize()), query);
        PageResult<AdminBlogUserVO> result = new PageResult<>();
        result.setPage(Math.toIntExact(page.getCurrent()));
        result.setSize(Math.toIntExact(page.getSize()));
        result.setTotal(page.getTotal());
        result.setPages(Math.toIntExact(page.getPages()));
        result.setList(page.getRecords().stream().map(this::toAdminView).toList());
        return result;
    }

    @Override
    public AdminBlogUserVO getUser(Long userId) {
        BlogUser user = blogUserMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        return toAdminView(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @BlogUserOperation(BlogUserAction.ADMIN_CHANGE_STATUS)
    public void changeStatus(Long userId, AdminBlogUserStatusDTO dto) {
        BlogUser user = getUserForUpdate(userId);
        String targetStatus = dto.getStatus();
        if (!isAllowedStatusChange(user.getStatus(), targetStatus)) {
            throw new BusinessException(ErrorCode.CONFLICT, "当前账号状态不允许此操作");
        }

        user.setStatus(targetStatus);
        if (BlogUserStatus.DISABLED.getValue().equals(targetStatus)) {
            user.setPasswordVersion(user.getPasswordVersion() + 1);
        }
        updateLockedUser(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @BlogUserOperation(BlogUserAction.ADMIN_DELETE_USER)
    public void deleteUser(Long userId) {
        BlogUser user = getUserForUpdate(userId);
        if (!isDeletableStatus(user.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "当前账号状态不允许此操作");
        }
        if (blogUserMapper.deleteById(userId) != 1) {
            throw new BusinessException(ErrorCode.CONFLICT, "用户数据已发生变化，请重试");
        }
    }

    private String normalizeKeyword(String keyword) {
        return StringUtils.hasText(keyword) ? keyword.strip() : null;
    }

    private BlogUser getUserForUpdate(Long userId) {
        BlogUser user = blogUserMapper.selectByIdForUpdate(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        return user;
    }

    private boolean isAllowedStatusChange(String currentStatus, String targetStatus) {
        return (BlogUserStatus.ENABLED.getValue().equals(currentStatus)
                && BlogUserStatus.DISABLED.getValue().equals(targetStatus))
                || (BlogUserStatus.DISABLED.getValue().equals(currentStatus)
                && BlogUserStatus.ENABLED.getValue().equals(targetStatus));
    }

    private boolean isDeletableStatus(String status) {
        return BlogUserStatus.ENABLED.getValue().equals(status)
                || BlogUserStatus.DISABLED.getValue().equals(status);
    }

    private void updateLockedUser(BlogUser user) {
        if (blogUserMapper.updateById(user) != 1) {
            throw new BusinessException(ErrorCode.CONFLICT, "用户数据已发生变化，请重试");
        }
    }

    private AdminBlogUserVO toAdminView(BlogUser user) {
        return AdminBlogUserVO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .status(user.getStatus())
                .deleteAt(user.getDeleteAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
