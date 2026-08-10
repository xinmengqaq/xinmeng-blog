package com.xinmengqaq.springboot.user.service;

import com.xinmengqaq.springboot.user.dto.BlogUserLoginDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRegisterDTO;
import com.xinmengqaq.springboot.user.dto.EmailCodeSendDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserPasswordResetDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRestoreDTO;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import jakarta.validation.Valid;

public interface BlogUserAuthService {
    void sendRegisterEmailCode(EmailCodeSendDTO emailCodeSendDTO, String clientIP);

    void register(BlogUserRegisterDTO blogUserRegisterDTO);

    BlogUserVO login(BlogUserLoginDTO dto);

    void logout(String token);

    /**
     * 发送找回密码邮箱验证码，对不存在邮箱返回相同结果。
     *
     * @param dto 邮箱和图形验证码
     * @param clientIp 客户端 IP
     */
    void sendPasswordResetCode(EmailCodeSendDTO dto, String clientIp);

    /**
     * 使用邮箱验证码重置密码。
     *
     * @param dto 密码重置请求
     */
    void resetPassword(BlogUserPasswordResetDTO dto);

    /**
     * 恢复仍在期限内的待删除账号。
     *
     * @param dto 账号恢复请求
     */
    void restoreAccount(BlogUserRestoreDTO dto);
}
