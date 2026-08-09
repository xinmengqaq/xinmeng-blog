package com.xinmengqaq.springboot.user.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xinmengqaq.springboot.user.config.BlogUserDetails;
import com.xinmengqaq.springboot.user.entity.BlogUser;
import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import jakarta.annotation.Resource;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class BlogUserDetailsService implements UserDetailsService {

    @Resource
    private BlogUserMapper blogUserMapper;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        String normalized = email.strip().toLowerCase(Locale.ROOT);
        BlogUser user = blogUserMapper.selectOne(
                new LambdaQueryWrapper<BlogUser>().eq(BlogUser::getEmail, normalized));
        if (user == null) {
            throw new UsernameNotFoundException("用户不存在");
        }
        return new BlogUserDetails(user);
    }
}
