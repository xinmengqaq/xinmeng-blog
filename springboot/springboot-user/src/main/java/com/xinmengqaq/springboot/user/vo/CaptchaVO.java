package com.xinmengqaq.springboot.user.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
public class CaptchaVO {

    private String captchaId;

    private String imageBase64;
}
