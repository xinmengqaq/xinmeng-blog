package com.xinmengqaq.springboot.admin.entity;

import lombok.Data;


@Data
public class Admin {

    private Long id; // 管理员ID，主键


    private String username; // 管理员用户名


    private String password; // 管理员密码


    private String name; // 管理员真实姓名


    private String role; // 管理员角色


    private String avatar; // 管理员头像路径

    private Integer passwordVersion; // 密码版本号，修改密码后递增，用来让旧 Token 失效

}

