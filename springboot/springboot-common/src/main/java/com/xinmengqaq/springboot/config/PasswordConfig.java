package com.xinmengqaq.springboot.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    /*
     * 笔记：[Spring] @Configuration + @Bean
     * @Configuration 标记类为 IoC 配置类，内部用 @Bean 注解的方法会把返回值注册为 Spring Bean，Bean 名默认是方法名。
     * 和 @Component 的区别：@Component 靠组件扫描自动注册已有类，@Configuration + @Bean 用于手动组装第三方库对象或多步骤构造的 Bean。
     * 本项目 PasswordEncoder 是 spring-security-crypto 的类，无法在它源码上加注解，只能在这里用 @Bean 声明。
     */

/**
 * 配置密码加密器Bean
 * 使用BCrypt加密算法对密码进行加密处理
 * BCrypt是一种安全的密码哈希算法，能够自动加盐并防止彩虹表攻击
 *
 * @return PasswordEncoder 密码加密器实例，用于用户密码的加密验证
 */
    @Bean
    public PasswordEncoder passwordEncoder() {
        /*
         * 笔记：[Spring] BCryptPasswordEncoder
         * BCrypt 是自适应密码哈希算法，来自 spring-security-crypto（只需这一个依赖，不引完整 spring-boot-starter-security）。
         * encode(明文) 每次生成随机盐再哈希，同一密码每次密文都不同，防彩虹表；
         * matches(明文, 密文) 内部从密文提取盐重新哈希明文再比对，验证时直接传明文和库里的密文。
         * 像每次寄存行李都换一把不同钥匙，验证时拿钥匙和存根比对而不是还原钥匙。
         */
        return new BCryptPasswordEncoder();
    }

}

