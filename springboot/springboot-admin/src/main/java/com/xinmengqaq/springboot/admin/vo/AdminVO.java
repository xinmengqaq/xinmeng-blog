package com.xinmengqaq.springboot.admin.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.xinmengqaq.springboot.admin.entity.Admin;
import lombok.Builder;
import lombok.Data;

/**
 * 管理员登录响应VO
 * 用于封装管理员登录成功后返回的用户信息
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
public class AdminVO {

    /*
     * 笔记：[Spring] @JsonInclude(JsonInclude.Include.NON_NULL)
     * Jackson 序列化注解，NON_NULL 表示值为 null 的字段不输出到 JSON。
     * 同一个 AdminVO 复用在多个接口：登录时带 token，获取资料时不带 token（token 为 null），加注解后 JSON 自动省略 token 字段。
     * 不加则前端收到 "token":null，需要前端自行判空。
     */

    /*
     * 笔记：[Boot] @Builder
     * Lombok 注解，生成链式构造器 builder()，用 .id().username().build() 组装对象，替代多参数构造器。
     * 字段有默认值时需配合 @Builder.Default，否则 Builder 会覆盖字段初始值（Builder 默认值和字段初始值是两套）。
     * 适合 VO 从 Entity 转换时清楚指定每个返回字段，漏写的字段默认 null。
     */

    //管理员id
    private Long id;

    //用户名
    private String username;

    //姓名
    private String name;

    //角色
    private String role;

    //头像URL
    private String avatar;

    //登录令牌
    private String token;


    public static AdminVO from(Admin admin) {
        return AdminVO.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .name(admin.getName())
                .role(admin.getRole())
                .avatar(admin.getAvatar())
                .build();
    }
}
