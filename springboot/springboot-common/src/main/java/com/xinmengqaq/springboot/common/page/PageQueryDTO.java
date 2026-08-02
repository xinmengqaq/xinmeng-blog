package com.xinmengqaq.springboot.common.page;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
public class PageQueryDTO {

    /*
     * 笔记：[Spring] @Validated
     * Spring 对 JSR-303 的扩展，写在类上表示该类的属性参与校验，常用在 GET 请求的 query 参数 DTO 上
     * （GET 没有 @RequestBody，@Valid 不会自动触发，靠 @Validated + 方法级参数解析触发）。
     * 和 @Valid 区别：@Valid 是 JSR-303 标准，支持级联校验但不支持分组；@Validated 支持分组校验和方法级校验。
     */

    @Min(value = 1, message = "页码最小为1")
    private Integer page = 1;

    /*
     * 笔记：[Spring] @Min / @Max
     * JSR-303 数值范围约束：@Min 限定最小值，@Max 限定最大值，可同时用在包装类型字段上。
     * 校验失败时抛 ConstraintViolationException（@Validated 类级）或 MethodArgumentNotValidException（@RequestBody @Valid），
     * message 属性自定义错误提示，由全局异常处理器提取后返回前端。
     */
    @Min(value = 1, message = "每页数量最小为1")
    @Max(value = 100, message = "每页数量最大为100")
    private Integer size = 10;

}

