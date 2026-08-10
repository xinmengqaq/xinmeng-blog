package com.xinmengqaq.springboot.user.service;

import com.xinmengqaq.springboot.common.PageResult;
import com.xinmengqaq.springboot.user.dto.AdminBlogUserPageQueryDTO;
import com.xinmengqaq.springboot.user.dto.AdminBlogUserStatusDTO;
import com.xinmengqaq.springboot.user.vo.AdminBlogUserVO;

/**
 * 管理员管理普通用户的业务能力。
 */
public interface AdminBlogUserService {

    PageResult<AdminBlogUserVO> pageUsers(AdminBlogUserPageQueryDTO dto);

    AdminBlogUserVO getUser(Long userId);

    void changeStatus(Long userId, AdminBlogUserStatusDTO dto);

    void deleteUser(Long userId);
}
