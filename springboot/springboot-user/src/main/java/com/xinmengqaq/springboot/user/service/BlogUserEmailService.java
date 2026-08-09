package com.xinmengqaq.springboot.user.service;

import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;

public interface BlogUserEmailService {

    void send(EmailCodePurpose purpose, String email, String clientIp);

    Boolean consume(EmailCodePurpose purpose, String email, String inputCode);

}
