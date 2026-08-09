package com.xinmengqaq.springboot.config.email;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.stream.IntStream;


@Component
public class EmailCodeGenerator {

    /**
     * 生成验证码
     * @return 六位验证码
     */
    public  String generate(){
        SecureRandom secureRandom = new SecureRandom();
        IntStream code = secureRandom.ints(6, 0, 10);
        StringBuilder codeBuilder = new StringBuilder();
        code.forEach(codeBuilder::append);
        return codeBuilder.toString();
    }



}
