package com.xinmengqaq.springboot;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;


@MapperScan("com.xinmengqaq.springboot.*.mapper")
@SpringBootApplication
public class SpringbootApplication {

    /*
     * 笔记：[Boot] @SpringBootApplication
     * Spring Boot 启动类核心注解，是三合一组合：@SpringBootConfiguration（标记为配置类）
     * + @EnableAutoConfiguration（按 classpath 依赖自动装配 Bean）+ @ComponentScan（扫描所在包及子包的组件）。
     * 默认只扫描启动类所在包及下级包，所以业务代码要放在启动类的下级包里才能被发现。
     * 像总开关，一个注解同时接通"配置、自动装配、组件扫描"三条线路。
     */

    /*
     * 笔记：[MyBatis] @MapperScan
     * 来自 mybatis-spring，批量扫描指定包下的 Mapper 接口并注册为 Bean，免去每个接口单独写 @Mapper。
     * 参数支持通配符：com.xinmengqaq.springboot.*.mapper 表示扫描所有一级子模块下的 mapper 包。
     * 和单接口 @Mapper 二选一：@MapperScan 统一管全部，@Mapper 标一个；本项目用 @MapperScan 集中管理。
     */

    public static void main(String[] args) {
        SpringApplication.run(SpringbootApplication.class, args);
    }

}
