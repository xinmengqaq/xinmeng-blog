package com.xinmengqaq.springboot.user.aop;

import com.xinmengqaq.springboot.user.enums.BlogUserStatus;

/**
 * 用户操作日志的固定动作值。
 */
public enum BlogUserAction {
    ISSUE_CAPTCHA("获取图形验证码"),
    SEND_REGISTER_EMAIL_CODE("发送注册验证码"),
    REGISTER("用户注册"),
    LOGIN("用户登录"),
    LOGOUT("用户退出登录"),
    SEND_PASSWORD_RESET_CODE("发送密码重置验证码"),
    RESET_PASSWORD("重置密码"),
    UPDATE_PROFILE("修改个人资料"),
    CHANGE_PASSWORD("修改密码"),
    SEND_EMAIL_CHANGE_CODE("发送邮箱修改验证码"),
    CHANGE_EMAIL("修改邮箱"),
    CANCEL_ACCOUNT("注销账号"),
    RESTORE_ACCOUNT("恢复账号"),
    ADMIN_CHANGE_STATUS("管理员修改用户状态"),
    ADMIN_ENABLE_USER("管理员启用用户"),
    ADMIN_DISABLE_USER("管理员禁用用户"),
    ADMIN_DELETE_USER("管理员删除用户");

    private final String description;

    BlogUserAction(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    /**
     * 根据管理员提交的目标状态解析实际审计动作。
     *
     * @param status 目标用户状态值
     * @return 启用、禁用或无法细分时的状态变更动作
     */
    public static BlogUserAction fromAdminStatus(String status) {
        if (BlogUserStatus.ENABLED.getValue().equals(status)) {
            return ADMIN_ENABLE_USER;
        }
        if (BlogUserStatus.DISABLED.getValue().equals(status)) {
            return ADMIN_DISABLE_USER;
        }
        return ADMIN_CHANGE_STATUS;
    }
}
