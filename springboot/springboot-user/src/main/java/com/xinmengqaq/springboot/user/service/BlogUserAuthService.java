package com.xinmengqaq.springboot.user.service;

import com.xinmengqaq.springboot.user.dto.BlogUserLoginDTO;
import com.xinmengqaq.springboot.user.dto.BlogUserRegisterDTO;
import com.xinmengqaq.springboot.user.dto.EmailCodeSendDTO;
import com.xinmengqaq.springboot.user.vo.BlogUserVO;
import jakarta.validation.Valid;

public interface BlogUserAuthService {
    void sendRegisterEmailCode(EmailCodeSendDTO emailCodeSendDTO, String clientIP);

    void register(BlogUserRegisterDTO blogUserRegisterDTO);

    BlogUserVO login(BlogUserLoginDTO dto);

    void logout(String token);
}
