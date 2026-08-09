package com.xinmengqaq.springboot.admin.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
public class AdminCaptchaVO {

    private String captchaId;

    private String imageBase64;
}
