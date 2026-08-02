package com.xinmengqaq.springboot.common;

import com.xinmengqaq.springboot.common.enums.ErrorCode;
import lombok.Data;

@Data
public class Result {

    private String code;

    private String msg;

    private Object data;


    /**
     * 构建一个成功的响应结果
     * @return 返回一个包含成功状态码和消息的Result对象
     */
    public static Result success() {

        return build(ErrorCode.SUCCESS.getCode(), ErrorCode.SUCCESS.getMessage(), null);
    }

    /**
     * 构建成功结果的方法
     * @param data 返回的数据对象
     * @return 返回一个包含成功状态码、成功信息和数据的Result对象
     */
    public static Result success(Object data) {
        return build(ErrorCode.SUCCESS.getCode(), ErrorCode.SUCCESS.getMessage(), data);
    }

    /**
     * 构建一个错误结果对象
     * @param errorCode 错误码对象，包含错误码和错误信息
     * @return 返回一个包含错误码和错误信息的结果对象
     */
    public static Result error(ErrorCode errorCode) {
        return build(errorCode.getCode(), errorCode.getMessage(), null);
    }

    /**
     * 构建一个错误结果对象
     * @param errorCode 错误码对象，包含错误码和错误信息
     * @param msg 自定义的错误信息，可以为null
     * @return 返回一个包含错误码和错误信息的结果对象
     */
    public static Result error(ErrorCode errorCode, String msg) {
        return build(errorCode.getCode(), msg, null);
    }

    /**
     * 构建一个错误结果的静态方法
     * @param code 错误码，用于标识具体的错误类型
     * @param msg 错误信息，用于描述错误的具体内容
     * @return 返回一个包含错误码和错误信息的Result对象
     */
    public static Result error(String code, String msg) {
        return build(code, msg, null);
    }

    /**
     * 构建并返回一个Result对象
     * @param code 状态码，用于表示请求的处理结果状态
     * @param msg 状态信息，对状态码的补充说明
     * @param data 返回的数据内容，可以是任意类型
     * @return 返回一个包含指定状态码、信息和数据的Result对象
     */
    private static Result build(String code, String msg, Object data) {
    // 创建一个新的Result对象实例
        Result result = new Result();
    // 设置状态码
        result.setCode(code);
    // 设置状态信息
        result.setMsg(msg);
    // 设置返回数据
        result.setData(data);
    // 返回构建完成的Result对象
        return result;
    }
}
