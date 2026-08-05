package com.xinmengqaq.springboot.common.exception;


import com.xinmengqaq.springboot.common.Result;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import io.jsonwebtoken.JwtException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;


@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /*
     * 笔记：[SpringMVC] @RestControllerAdvice + @ExceptionHandler
     * @RestControllerAdvice = @ControllerAdvice + @ResponseBody，全局拦截所有 Controller 抛出的异常，返回值自动转 JSON。
     * @ExceptionHandler(异常类型) 标记方法处理哪类异常，Spring 按异常类型最近匹配优先分发。
     * 本项目按 BusinessException、参数校验异常、JwtException、兜底 Exception 分别处理，
     * 这样 Controller 里只管抛业务异常，不用每个接口自己 try-catch，异常响应格式统一。
     */

/**
 * 全局异常处理方法，用于处理业务异常
 * 当系统中抛出BusinessException类型的异常时，此方法会被自动调用
 *
 * @param e 捕获到的业务异常对象
 * @return 返回一个Result对象，包含错误码和错误信息
 */
    @ExceptionHandler(BusinessException.class)  // 标记此方法用于处理BusinessException类型的异常
    public ResponseEntity<Result> handleBusinessException(BusinessException e) {
        return error(resolveHttpStatus(e.getCode()), Result.error(e.getCode(), e.getMessage()));
    }

    /**
     * 处理绑定异常
     * @param e 绑定异常
     * @return 错误信息
     */
    @ExceptionHandler(BindException.class)
    public ResponseEntity<Result> handleBindException(BindException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();   // 从绑定结果中获取第一个字段错误信息
        String msg = fieldError != null ? fieldError.getDefaultMessage() : ErrorCode.PARAM_ERROR.getMessage();   // 如果存在字段错误则使用其默认消息，否则使用参数错误的默认消息
        return error(HttpStatus.BAD_REQUEST, Result.error(ErrorCode.PARAM_ERROR, msg));
    }

    /**
     * 处理缺少请求参数异常
     * @param e 缺少请求参数异常
     * @return 错误信息
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Result> handleMissingServletRequestParameterException(MissingServletRequestParameterException e) {
        return error(HttpStatus.BAD_REQUEST,
                Result.error(ErrorCode.PARAM_ERROR, e.getParameterName() + " 不能为空"));
    }

    /**
     * 处理请求方法不支持异常
     * @param e 请求方法不支持异常
     * @return HTTP 405 和统一错误响应
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Result> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException e) {
        HttpHeaders headers = new HttpHeaders();
        if (e.getSupportedHttpMethods() != null) {
            headers.setAllow(e.getSupportedHttpMethods());
        }
        log.warn("请求方法不支持: method={}, supportedMethods={}", e.getMethod(), e.getSupportedMethods());
        return new ResponseEntity<>(
                Result.error(ErrorCode.METHOD_NOT_ALLOWED),
                headers,
                HttpStatus.METHOD_NOT_ALLOWED
        );
    }

    /**
     * 处理其他异常
     * @param e 其他异常
     * @return 错误信息
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result> handleException(Exception e) {
        log.error("系统异常", e);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, Result.error(ErrorCode.SYSTEM_ERROR));
    }

    /**
     * 处理参数校验异常
     * @param e 参数校验异常
     * @return 错误信息
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result> handleMethodArgumentNotValidException(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String msg = fieldError != null ? fieldError.getDefaultMessage() : ErrorCode.PARAM_ERROR.getMessage();
        return error(HttpStatus.BAD_REQUEST, Result.error(ErrorCode.PARAM_ERROR, msg));
    }

    /**
     * 处理 JWT 解析、签名、过期等异常。
     */
    @ExceptionHandler(JwtException.class)
    public ResponseEntity<Result> handleJwtException(JwtException e) {
        return error(HttpStatus.UNAUTHORIZED,
                Result.error(ErrorCode.UNAUTHORIZED, "登录已过期，请重新登录"));

    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Result> handleNoResourceFoundException(NoResourceFoundException e) {
        return error(HttpStatus.NOT_FOUND, Result.error(ErrorCode.NOT_FOUND));
    }

    private ResponseEntity<Result> error(HttpStatus status, Result result) {
        return ResponseEntity.status(status).body(result);
    }

    private HttpStatus resolveHttpStatus(String code) {
        try {
            HttpStatus status = HttpStatus.resolve(Integer.parseInt(code));
            return status != null && status.isError() ? status : HttpStatus.BAD_REQUEST;
        } catch (NumberFormatException e) {
            return HttpStatus.BAD_REQUEST;
        }
    }

}
