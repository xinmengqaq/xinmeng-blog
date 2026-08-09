package com.xinmengqaq.springboot.user.service;

import com.xinmengqaq.springboot.user.vo.CaptchaVO;

public interface BlogUserCaptchaService {

    CaptchaVO CreateCaptcha(String clientIp);

    boolean consume(String captchaId, String captchaCode);

}
