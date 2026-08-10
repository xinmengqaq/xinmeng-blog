package com.xinmengqaq.springboot.user.dto;

import com.xinmengqaq.springboot.common.page.PageQueryDTO;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 管理员分页查询普通用户的请求参数。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class AdminBlogUserPageQueryDTO extends PageQueryDTO {

    @Size(max = 50, message = "关键词不能超过50个字符")
    private String keyword;

    @Pattern(regexp = "enabled|disabled|pending_deletion", message = "用户状态只能是 enabled、disabled 或 pending_deletion")
    private String status;
}
