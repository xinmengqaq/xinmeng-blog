package com.xinmengqaq.springboot.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import org.apache.ibatis.annotations.Param;

import java.time.OffsetDateTime;


public interface BlogUserMapper extends BaseMapper<BlogUser> {

    /**
     * 根据 id 查询用户，加锁
     * @param id 用户 id
     * @return 用户
     */
    BlogUser selectByIdForUpdate(@Param("id") Long id);

    /**
     * 根据邮箱查询用户，加锁
     * @param email 用户邮箱
     * @return 用户
     */
    BlogUser selectByEmailForUpdate(@Param("email") String email);

    /**
     * 删除过期的待激活用户
     * @param now 当前时间
     * @param limit 删除数量限制
     * @return 删除的用户数量
     */
    Long deleteExpiredPendingUsers(@Param("now") OffsetDateTime now, @Param("limit") int limit);

}
