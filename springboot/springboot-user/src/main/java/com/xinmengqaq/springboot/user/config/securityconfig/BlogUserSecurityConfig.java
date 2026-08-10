package com.xinmengqaq.springboot.user.config.securityconfig;

import com.xinmengqaq.springboot.config.JwtProperties;
import com.xinmengqaq.springboot.user.service.impl.BlogUserAuthServiceImpl;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.RememberMeServices;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;

import javax.crypto.SecretKey;

/**
 * 用户认证正式实现前的过渡配置，只建立用户接口的过滤链边界。
 *登录认证、JWT 校验和接口授权落地前，不提前启用对应能力。
 */
@Configuration
@EnableWebSecurity
public class BlogUserSecurityConfig {


    @Resource
    private PasswordEncoder passwordEncoder;

    @Resource
    private JwtProperties jwtProperties;

    @Resource
    private BlogUserJwtAuthenticationConverter jwtConverter;

    @Resource
    private BlogUserAuthenticationEntryPoint authenticationEntryPoint;

    @Resource
    private BlogUserAccessDeniedHandler accessDeniedHandler;



    // ① 认证管理器：login() 里 authenticate() 时用到
    @Bean
    AuthenticationManager authenticationManager(UserDetailsService userDetailsService) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    // ② JWT 验签解码器：和 JwtUtils 用同一把密钥
    @Bean
    JwtDecoder jwtDecoder() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtProperties.getSecret());
        SecretKey secretKey = Keys.hmacShaKeyFor(keyBytes);
        return NimbusJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }


    // ③ 过滤链（在原有基础上改两行 + 加两段）
    @Bean
    SecurityFilterChain blogUserSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/api/user/**") // 匹配用户接口
                .authorizeHttpRequests(authorize -> authorize // 授权请求
                        .requestMatchers(
                                "/api/user/captcha",
                                "/api/user/register",
                                "/api/user/register/email-code",
                                "/api/user/login",
                                "/api/user/password/reset/email-code",
                                "/api/user/password/reset",
                                "/api/user/account/restore"
                        ).permitAll() // 允许所有请求
                        .anyRequest().authenticated()) // 其他请求需要认证
                .oauth2ResourceServer(oauth2 -> oauth2 // OAuth2 资源服务器配置
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter)) // JWT 认证转换器
                        .authenticationEntryPoint(authenticationEntryPoint))
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(authenticationEntryPoint) // 认证入口点
                        .accessDeniedHandler(accessDeniedHandler)) // 访问拒绝处理
                .csrf(AbstractHttpConfigurer::disable) // 禁用 CSRF 防护
                .formLogin(AbstractHttpConfigurer::disable) // 禁用表单登录
                .httpBasic(AbstractHttpConfigurer::disable) // 禁用 HTTP 基本认证
                .logout(AbstractHttpConfigurer::disable) // 禁用注销功能
                .requestCache(AbstractHttpConfigurer::disable) // 禁用请求缓存
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // 禁用会话管理
                .build();
    }

}
