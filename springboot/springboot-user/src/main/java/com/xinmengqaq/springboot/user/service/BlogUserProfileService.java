package com.xinmengqaq.springboot.user.service;

import com.xinmengqaq.springboot.user.dto.BlogUserProfileUpdateDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserPasswordChangeDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailCodeSendDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserEmailChangeDTO;
import com.xinmengqaq.springboot.user.vo.BlogUserCancellationVO;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;

/**
 * 当前登录用户的个人资料能力。
 */
public interface BlogUserProfileService {

    /**
     * 查询当前登录用户的公开个人资料。
     *
     * @param userId 当前认证用户 ID
     * @return 不含密码和认证内部字段的用户资料
     */
    BlogUserVO getProfile(Long userId);

    /**
     * 修改当前登录用户的昵称并返回更新后的公开资料。
     *
     * @param userId 当前认证用户 ID
     * @param profileUpdateDTO 仅包含昵称的资料修改请求
     * @return 更新后的用户资料
     */
    BlogUserVO updateProfile(Long userId, BlogUserProfileUpdateDTO profileUpdateDTO);

    /**
     * 修改当前用户密码并使旧凭证失效。
     *
     * @param userId 当前认证用户 ID
     * @param dto 密码修改请求
     */
    void changePassword(Long userId, BlogUserPasswordChangeDTO dto);

    /**
     * 发送换绑邮箱验证码。
     *
     * @param userId 当前认证用户 ID
     * @param dto 换绑邮箱发码请求
     * @param clientIp 客户端 IP
     */
    void sendEmailChangeCode(Long userId, BlogUserEmailCodeSendDTO dto, String clientIp);

    /**
     * 修改当前用户登录邮箱并使旧凭证失效。
     *
     * @param userId 当前认证用户 ID
     * @param dto 换绑邮箱确认请求
     * @return 更新后的用户资料
     */
    BlogUserVO changeEmail(Long userId, BlogUserEmailChangeDTO dto);

    /**
     * 将当前用户账号置为待删除状态。
     *
     * @param userId 当前认证用户 ID
     * @return 预计物理删除时间
     */
    BlogUserCancellationVO cancelAccount(Long userId);
}
