package com.xinmengqaq.springboot.config;


import com.xinmengqaq.springboot.interceptor.AuthInterceptor;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    /*
     * 笔记：[SpringMVC] WebMvcConfigurer + addInterceptors
     * WebMvcConfigurer 是 Spring MVC 的扩展回调接口，实现它能定制拦截器、跨域、参数解析等，但不触发 @EnableWebMvc 的完全接管（保留 Spring Boot 默认 MVC 配置）。
     * addInterceptors 是其中一个回调：registry.addInterceptor(拦截器) 注册自定义拦截器，
     * .addPathPatterns("/api/admin/**") 配置拦截路径（** 匹配任意多层路径），
     * .excludePathPatterns(...) 排除白名单，排除优先于拦截。
     * 像大门保安排班表：谁站岗、哪几个门放行、哪几个门严查，都在这里登记。
     */

    @Resource
    private AuthInterceptor authInterceptor;

    /**
     * 配置拦截器
     * @param registry 拦截器注册器，用于注册和配置拦截器
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 添加认证拦截器，并配置拦截路径和排除路径
        registry.addInterceptor(authInterceptor)
                 // 拦截所有以 /api/admin/ 开头的路径
                .addPathPatterns("/api/admin/**")
                // 排除以下路径不被拦截
                .excludePathPatterns(
                        "/api/admin/login",
                        "/api/admin/captcha",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/webjars/**",
                        "/favicon.ico"
                );
    }
}
