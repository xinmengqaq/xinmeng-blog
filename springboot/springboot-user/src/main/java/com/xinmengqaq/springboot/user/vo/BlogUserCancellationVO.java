package com.xinmengqaq.springboot.user.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 账号注销返回 VO，包含预计删除时间
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
public class BlogUserCancellationVO {

    private OffsetDateTime deleteAt;

}