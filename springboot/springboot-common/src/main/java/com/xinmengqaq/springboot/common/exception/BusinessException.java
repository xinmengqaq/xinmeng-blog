package com.xinmengqaq.springboot.common.exception;

import com.xinmengqaq.springboot.common.enums.ErrorCode;
import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException{

    private final String code;

/**
 * 自定义业务异常类的构造方法
 * @param errorCode 错误码对象，包含错误信息和错误代码
 */
    public BusinessException(ErrorCode errorCode){
    // 调用父类构造方法，传入错误信息
        super(errorCode.getMessage());
    // 设置错误代码
        this.code = errorCode.getCode();
    }

    /**
 * 自定义业务异常类的构造函数
 * @param errorCode 错误码对象，包含错误代码信息
 * @param message 异常的详细信息描述
 */
    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.code = errorCode.getCode();
    }


    /**
     * 自定义业务异常类的构造函数
     * @param code 错误代码
     * @param message 异常的详细信息描述
     */
    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

}


