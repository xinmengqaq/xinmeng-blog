package com.xinmengqaq.springboot.user.config.securityconfig;

import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import com.xinmengqaq.springboot.user.enums.BlogUserStatus;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import jakarta.annotation.Resource;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Objects;

@Component
public class BlogUserJwtAuthenticationConverter implements Converter<Jwt, JwtAuthenticationToken> {

    @Resource
    private BlogUserMapper blogUserMapper;

    @Resource(name = "tokenBlacklistCache")
    private Cache<String, Boolean> tokenBlacklistCache;

    @Override
    public JwtAuthenticationToken convert(Jwt jwt) {

        if (tokenBlacklistCache.getIfPresent(jwt.getId()) != null) {
            throw new InvalidBearerTokenException("Token 已失效");  // 退出后该 token 立即作废
        }

        String tokenType = jwt.getClaimAsString("tokenType");
        if (!"user".equals(tokenType)) {
            throw new InvalidBearerTokenException("Token 类型错误");
        }

        Long userId = Long.valueOf(jwt.getSubject());
        BlogUser user = blogUserMapper.selectById(userId);   // MyBatis-Plus selectById
        if (user == null) {
            throw new InvalidBearerTokenException("用户不存在");
        }
        if (!BlogUserStatus.ENABLED.getValue().equals(user.getStatus())) {
            throw new InvalidBearerTokenException("账号状态异常");   // 禁用/待删除 -> 401
        }
        Number passwordVersionClaim = jwt.getClaim("passwordVersion");
        Integer tokenVersion = passwordVersionClaim == null ? null : passwordVersionClaim.intValue();
        if (!Objects.equals(tokenVersion, user.getPasswordVersion())) {
            throw new InvalidBearerTokenException("凭证版本不一致");  // 改密码后旧 Token -> 401
        }

        return new JwtAuthenticationToken(jwt, Collections.emptyList(), String.valueOf(userId));

    }
}
