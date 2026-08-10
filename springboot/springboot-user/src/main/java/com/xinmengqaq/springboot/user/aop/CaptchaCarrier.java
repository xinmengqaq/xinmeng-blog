package com.xinmengqaq.springboot.user.aop;

public interface CaptchaCarrier {

    /**
     * 返回当前请求携带的图形验证码标识。
     *
     * @return 图形验证码 ID
     */
    String getCaptchaId();

    /**
     * 返回当前请求携带的图形验证码内容。
     *
     * @return 用户输入的验证码文本
     */
    String getCaptchaCode();

}
