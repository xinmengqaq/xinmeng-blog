package com.xinmengqaq.springboot.user.aop;

import com.xinmengqaq.springboot.user.enums.BlogUserStatus;

/**
 * 用户操作日志的固定动作值。
 */
public enum BlogUserAction {
    ISSUE_CAPTCHA,
    SEND_REGISTER_EMAIL_CODE,
    REGISTER,
    LOGIN,
    LOGOUT,
    SEND_PASSWORD_RESET_CODE,
    RESET_PASSWORD,
    UPDATE_PROFILE,
    CHANGE_PASSWORD,
    SEND_EMAIL_CHANGE_CODE,
    CHANGE_EMAIL,
    CANCEL_ACCOUNT,
    RESTORE_ACCOUNT,
    ADMIN_CHANGE_STATUS,
    ADMIN_ENABLE_USER,
    ADMIN_DISABLE_USER,
    ADMIN_DELETE_USER;

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
