package com.xinmengqaq.springboot.user.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xinmengqaq.springboot.common.PageResult;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.user.dto.AdminBlogUserPageQueryDTO;
import com.xinmengqaq.springboot.user.dto.AdminBlogUserStatusDTO;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import com.xinmengqaq.springboot.user.vo.AdminBlogUserVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminBlogUserServiceImplTest {

    @Mock
    private BlogUserMapper blogUserMapper;

    @InjectMocks
    private AdminBlogUserServiceImpl adminBlogUserService;

    @Test
    @DisplayName("管理员分页查询会返回公开字段和 MyBatis-Plus 分页信息")
    void pageUsersMapsMybatisPlusPageToAdminView() {
        BlogUser user = user(12L, "enabled", 3);
        when(blogUserMapper.selectPage(org.mockito.ArgumentMatchers.<Page<BlogUser>>any(), any())).thenAnswer(invocation -> {
            Page<BlogUser> page = invocation.getArgument(0);
            page.setRecords(List.of(user));
            page.setTotal(11L);
            return page;
        });

        AdminBlogUserPageQueryDTO dto = new AdminBlogUserPageQueryDTO();
        dto.setPage(2);
        dto.setSize(5);
        dto.setKeyword(" reader ");
        dto.setStatus("enabled");

        PageResult<AdminBlogUserVO> result = adminBlogUserService.pageUsers(dto);

        assertThat(result.getPage()).isEqualTo(2);
        assertThat(result.getSize()).isEqualTo(5);
        assertThat(result.getTotal()).isEqualTo(11L);
        assertThat(result.getPages()).isEqualTo(3);
        assertThat(result.getList()).singleElement().satisfies(view -> {
            assertThat(view.getId()).isEqualTo(12L);
            assertThat(view.getEmail()).isEqualTo("reader@example.com");
            assertThat(view.getNickname()).isEqualTo("小读者");
            assertThat(view.getStatus()).isEqualTo("enabled");
            assertThat(view.getDeleteAt()).isNull();
        });

        verify(blogUserMapper).selectPage(
                argThat(page -> page.getCurrent() == 2L && page.getSize() == 5L),
                any()
        );
    }

    @Test
    @DisplayName("查看不存在的普通用户会返回用户不存在")
    void getUserRejectsMissingUser() {
        when(blogUserMapper.selectById(12L)).thenReturn(null);

        assertThatThrownBy(() -> adminBlogUserService.getUser(12L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.NOT_FOUND.getCode());
                    assertThat(exception.getMessage()).isEqualTo("用户不存在");
                });
    }

    @Test
    @DisplayName("禁用启用用户会加锁并递增凭证版本")
    void changeStatusDisablesEnabledUserAndInvalidatesTokens() {
        BlogUser user = user(12L, "enabled", 3);
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user);
        when(blogUserMapper.updateById(user)).thenReturn(1);

        adminBlogUserService.changeStatus(12L, statusDTO("disabled"));

        assertThat(user.getStatus()).isEqualTo("disabled");
        assertThat(user.getPasswordVersion()).isEqualTo(4);
        verify(blogUserMapper).selectByIdForUpdate(12L);
        verify(blogUserMapper).updateById(user);
    }

    @Test
    @DisplayName("重新启用账号不会恢复禁用前已经失效的凭证版本")
    void changeStatusEnablesDisabledUserWithoutChangingCredentialVersion() {
        BlogUser user = user(12L, "disabled", 4);
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user);
        when(blogUserMapper.updateById(user)).thenReturn(1);

        adminBlogUserService.changeStatus(12L, statusDTO("enabled"));

        assertThat(user.getStatus()).isEqualTo("enabled");
        assertThat(user.getPasswordVersion()).isEqualTo(4);
    }

    @Test
    @DisplayName("重复状态变更会返回冲突且不更新数据库")
    void changeStatusRejectsRepeatedTargetStatus() {
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user(12L, "disabled", 4));

        assertThatThrownBy(() -> adminBlogUserService.changeStatus(12L, statusDTO("disabled")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("当前账号状态不允许此操作");
                });

        verify(blogUserMapper, never()).updateById(any(BlogUser.class));
    }

    @Test
    @DisplayName("待删除账号不能由管理员启用或禁用")
    void changeStatusRejectsPendingDeletionUser() {
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user(12L, "pending_deletion", 4));

        assertThatThrownBy(() -> adminBlogUserService.changeStatus(12L, statusDTO("enabled")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("当前账号状态不允许此操作");
                });

        verify(blogUserMapper, never()).updateById(any(BlogUser.class));
    }

    @Test
    @DisplayName("锁定后乐观锁更新失败会返回并发冲突")
    void changeStatusRejectsOptimisticLockConflict() {
        BlogUser user = user(12L, "enabled", 3);
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user);
        when(blogUserMapper.updateById(user)).thenReturn(0);

        assertThatThrownBy(() -> adminBlogUserService.changeStatus(12L, statusDTO("disabled")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("用户数据已发生变化，请重试");
                });
    }

    @Test
    @DisplayName("管理员删除启用用户会在加锁后直接物理删除")
    void deleteUserDeletesEnabledUserImmediately() {
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user(12L, "enabled", 3));
        when(blogUserMapper.deleteById(12L)).thenReturn(1);

        adminBlogUserService.deleteUser(12L);

        verify(blogUserMapper).selectByIdForUpdate(12L);
        verify(blogUserMapper).deleteById(12L);
    }

    @Test
    @DisplayName("管理员不能删除待删除账号")
    void deleteUserRejectsPendingDeletionUser() {
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user(12L, "pending_deletion", 4));

        assertThatThrownBy(() -> adminBlogUserService.deleteUser(12L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("当前账号状态不允许此操作");
                });

        verify(blogUserMapper, never()).deleteById(12L);
    }

    @Test
    @DisplayName("锁定后删除影响零行会返回并发冲突")
    void deleteUserRejectsConcurrentDeletion() {
        when(blogUserMapper.selectByIdForUpdate(12L)).thenReturn(user(12L, "disabled", 4));
        when(blogUserMapper.deleteById(12L)).thenReturn(0);

        assertThatThrownBy(() -> adminBlogUserService.deleteUser(12L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo(ErrorCode.CONFLICT.getCode());
                    assertThat(exception.getMessage()).isEqualTo("用户数据已发生变化，请重试");
                });
    }

    private AdminBlogUserStatusDTO statusDTO(String status) {
        AdminBlogUserStatusDTO dto = new AdminBlogUserStatusDTO();
        dto.setStatus(status);
        return dto;
    }

    private BlogUser user(Long id, String status, Integer passwordVersion) {
        BlogUser user = new BlogUser();
        user.setId(id);
        user.setEmail("reader@example.com");
        user.setPassword("$2a$10$stored-password-hash");
        user.setNickname("小读者");
        user.setAvatar("/files/avatar/reader.png");
        user.setStatus(status);
        user.setPasswordVersion(passwordVersion);
        user.setVersion(7);
        user.setCreatedAt(OffsetDateTime.parse("2026-08-09T12:00:00+08:00"));
        user.setUpdatedAt(OffsetDateTime.parse("2026-08-09T13:00:00+08:00"));
        return user;
    }
}
