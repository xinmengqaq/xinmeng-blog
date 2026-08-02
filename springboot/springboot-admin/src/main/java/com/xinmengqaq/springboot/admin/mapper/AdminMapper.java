package com.xinmengqaq.springboot.admin.mapper;


import com.xinmengqaq.springboot.admin.entity.Admin;
import org.apache.ibatis.annotations.Param;

public interface AdminMapper {

    /*
     * 笔记：[MyBatis] @Param
     * MyBatis 参数绑定注解，给 Mapper 方法参数起名字，XML 里用 #{名字} 引用对应参数值。
     * 单参数时可以不写（MyBatis 自动用参数名），多参数时必须写，否则 MyBatis 找不到对应参数会报错。
     * 本项目 selectByUsername(@Param("username") String username) 对应 XML 里 where username = #{username}。
     */

    /**
     * 根据用户名查询管理员
     * @param username 用户名
     * @return 管理员信息，不存在时返回 null
     */
    Admin selectByUsername(@Param("username") String username);

    /**
     * 根据管理员 ID 查询管理员
     * @param id 管理员 ID
     * @return 管理员信息，不存在时返回 null
     */
    Admin selectById(@Param("id") Long id);

    /**
     * 根据管理员 ID 查询并锁定管理员记录
     * @param id 管理员 ID
     * @return 管理员信息，不存在时返回 null
     */
    Admin selectByIdForUpdate(@Param("id") Long id);


    /**
     * 修改管理员资料
     * @param admin 管理员资料修改参数
     * @return 影响行数
     */
    int updateProfile(Admin admin);

    /**
     * 修改管理员密码
     * @param id 管理员 ID
     * @param newPassword 新密码
     * @return 影响行数
     */
    int changePassword(@Param("id") Long id, @Param("newPassword") String newPassword);
}

