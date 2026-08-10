package com.xinmengqaq.springboot.user.controller;

import com.xinmengqaq.springboot.common.PageResult;
import com.xinmengqaq.springboot.common.Result;
import com.xinmengqaq.springboot.user.dto.AdminBlogUserPageQueryDTO;
import com.xinmengqaq.springboot.user.dto.AdminBlogUserStatusDTO;
import com.xinmengqaq.springboot.user.service.AdminBlogUserService;
import com.xinmengqaq.springboot.user.vo.AdminBlogUserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理员管理普通用户的接口，认证由现有 /api/admin/** MVC 拦截器处理。
 */
@Slf4j
@Tag(name = "用户模块/普通用户管理", description = "管理员查询、启禁用和删除普通用户接口")
@RestController
@RequestMapping("/api/admin/users")
public class AdminBlogUserController {

    @Resource
    private AdminBlogUserService adminBlogUserService;

    @Operation(summary = "分页查询普通用户")
    @GetMapping
    public Result pageUsers(@Validated @ParameterObject AdminBlogUserPageQueryDTO dto) {
        log.info("收到管理员分页查询普通用户请求，page={}, size={}", dto.getPage(), dto.getSize());
        PageResult<AdminBlogUserVO> result = adminBlogUserService.pageUsers(dto);
        return Result.success(result);
    }

    @Operation(summary = "查看普通用户详情")
    @GetMapping("/{id}")
    public Result getUser(@PathVariable("id") Long userId) {
        log.info("收到管理员查看普通用户详情请求，userId={}", userId);
        return Result.success(adminBlogUserService.getUser(userId));
    }

    @Operation(summary = "修改普通用户登录状态")
    @PatchMapping("/{id}/status")
    public Result changeStatus(@PathVariable("id") Long userId,
                               @Valid @RequestBody AdminBlogUserStatusDTO dto) {
        adminBlogUserService.changeStatus(userId, dto);
        Result result = Result.success();
        result.setMsg("enabled".equals(dto.getStatus()) ? "用户已启用" : "用户已禁用");
        return result;
    }

    @Operation(summary = "删除普通用户")
    @DeleteMapping("/{id}")
    public Result deleteUser(@PathVariable("id") Long userId) {
        adminBlogUserService.deleteUser(userId);
        Result result = Result.success();
        result.setMsg("用户删除成功，关联数据已清理");
        return result;
    }
}
