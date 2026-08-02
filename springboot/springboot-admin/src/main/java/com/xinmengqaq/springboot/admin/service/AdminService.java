package com.xinmengqaq.springboot.admin.service;

import com.xinmengqaq.springboot.admin.dto.AdminLoginDTO;
import com.xinmengqaq.springboot.admin.dto.AdminPasswordChangeDTO;
import com.xinmengqaq.springboot.admin.dto.AdminProfileUpdateDTO;
import com.xinmengqaq.springboot.admin.vo.AdminCaptchaVO;
import com.xinmengqaq.springboot.admin.vo.AdminVO;


public interface AdminService {

    /**
     *管理员登录接口
     */
    AdminVO login(AdminLoginDTO adminLoginDTO);


    /**
     * 获取当前登录管理员信息
     * @param id 管理员ID
     * @return 管理员信息不包含密码
     */
    AdminVO getCurrentAdmin(Long id);

    /**
     * 刷新当前管理员 Token
     * @param adminId 当前管理员 ID
     * @return 新 Token
     */
    String refreshToken(Long adminId);

    /**
     * 修改当前管理员资料
     * @param adminId 当前管理员 ID
     * @param adminProfileUpdateDTO 管理员资料修改参数
     * @return 修改后的管理员资料
     */
    AdminVO updateProfile(Long adminId, AdminProfileUpdateDTO adminProfileUpdateDTO);

    /**
     * 修改当前管理员密码
     * @param adminId 当前管理员 ID
     * @param dto 管理员密码修改参数
     */
    void changePassword(Long adminId, AdminPasswordChangeDTO dto);

    /**
     * 创建验证码
     * @param clientIp 客户端 IP
     * @return 验证码VO
     */
    AdminCaptchaVO createCaptcha(String clientIp);


}

