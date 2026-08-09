package com.xinmengqaq.springboot.admin.controller;

import cn.hutool.extra.servlet.JakartaServletUtil;
import com.xinmengqaq.springboot.common.Result;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.admin.dto.AdminLoginDTO;
import com.xinmengqaq.springboot.admin.dto.AdminPasswordChangeDTO;
import com.xinmengqaq.springboot.admin.dto.AdminProfileUpdateDTO;
import com.xinmengqaq.springboot.admin.service.AdminService;
import com.xinmengqaq.springboot.admin.vo.AdminCaptchaVO;
import com.xinmengqaq.springboot.admin.vo.AdminVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@Tag(name = "管理员模块/管理员管理", description = "后台管理员登录认证和资料管理接口")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    /*
     * 笔记：[日志] @Slf4j
     * Lombok 提供的日志门面注解，编译期在类里生成 private static final Logger log = LoggerFactory.getLogger(类.class)。
     * 直接用 log.info()/log.warn() 输出日志，不用手动声明 Logger。底层走 SLF4J，本项目接 Logback。
     */

    /*
     * 笔记：[SpringMVC] @RestController + @RequestMapping 类级映射
     * @RestController = @Controller + @ResponseBody，类下所有方法返回值自动 JSON 序列化，不用每个方法写 @ResponseBody。
     * @RequestMapping("/api/admin") 写在类上作公共前缀，方法上的 @PostMapping("/login") 等会拼接其上，最终路径是 /api/admin/login。
     * 类级放公共前缀、方法级放具体动作路径，避免每个方法重复写 /api/admin。
     */

    /*
     * 笔记：[Spring] @Resource
     * 来自 jakarta.annotation.Resource（Jakarta 标准，非 Spring 自带），依赖注入注解。
     * 默认按字段名 byName 注入，找不到再按类型 byType；可用 name 属性指定 bean 名。
     * 和 @Autowired 区别：@Autowired 是 Spring 的、默认 byType；@Resource 默认 byName。本项目统一用 @Resource。
     */

    @Resource
    private AdminService adminService;

    /**
    * 管理员登录接口
    * 该接口用于管理员登录系统，验证用户名和密码
    * 登录成功后返回包含Token的响应对象
    * @param adminLoginDTO 包含管理员用户名和密码的数据传输对象
    * @return 返回登录结果，包含Token信息
    */
    @Operation(summary = "管理员登录",description = "管理员输入用户名和密码，登录成功后返回 Token")
    @PostMapping("/login")
    public Result login(@Valid @RequestBody AdminLoginDTO adminLoginDTO){
        /*
         * 笔记：[SpringMVC] @PostMapping 家族
         * @PostMapping 是 @RequestMapping(method=POST) 的快捷方式，同族还有 @GetMapping/@PutMapping/@PatchMapping/@DeleteMapping，
         * 分别对应 POST 新增、GET 查询、PUT 整体修改、PATCH 局部修改、DELETE 删除，语义更清晰。
         * 路径写相对路径，会拼接到类级 @RequestMapping 前缀上。
         */
        /*
         * 笔记：[SpringMVC·Spring] @RequestBody + @Valid
         * @RequestBody 让 Spring 把请求体 JSON 反序列化成 DTO 对象（依赖 Jackson），不写则只接 form 参数。
         * @Valid 触发 JSR-303 校验，让 DTO 上的 @NotBlank/@Size 等注解在进业务前生效，校验失败抛 MethodArgumentNotValidException。
         * 两者常配合：先反序列化再校验，校验通过才进 Controller 方法体。
         */
        // 记录管理员登录请求日志，包含用户名信息
        log.info("收到管理员登录请求，username={}", adminLoginDTO.getUsername());

        // 调用服务层方法处理登录逻辑，返回登录结果对象
        AdminVO adminVO = adminService.login(adminLoginDTO);

        // 记录管理员登录接口处理完成日志，包含用户名信息
        log.info("管理员登录接口处理完成，username={}", adminLoginDTO.getUsername());

        // 返回成功响应，包含登录结果对象
        return Result.success(adminVO);
    }

    /**
     * 管理员退出登录接口
     * 该接口用于管理员退出登录系统，清除管理员的登录状态
     * @return 返回退出成功消息
     */
    @Operation(summary = "管理员退出登录",description = "管理员点击退出登录按钮，系统会清除管理员的登录状态")
    @PostMapping("/logout")
    public Result logout(){

        // 记录管理员退出登录请求日志
        log.info("管理员退出登录");

        // 调用服务层方法处理退出登录逻辑
        Result result = Result.success();

        // 设置退出成功消息
        result.setMsg("退出成功");
        return result;
    }

    /**
     * 获取当前登录管理员资料接口
     * @param request HTTP请求对象，包含管理员ID信息
     * @return 管理员资料视图对象，不包含密码信息
     */
    @Operation(summary = "获取当前登录管理员信息",description = "管理员点击获取当前登录管理员信息按钮，系统会返回当前登录管理员的用户名、角色等信息")
    @GetMapping("/profile")
    public Result profile(HttpServletRequest request){

        // 从请求中获取管理员ID
        Long adminId = resolveAdminId(request);

        // 记录获取当前管理员信息请求日志
        log.info("获取当前管理员信息请求，adminId={}", adminId);

        // 调用服务层方法获取当前登录管理员信息
        AdminVO adminVO = adminService.getCurrentAdmin(adminId);

        // 记录获取当前管理员信息成功日志
        log.info("获取当前管理员信息成功，adminId={}", adminId);

        return Result.success(adminVO);
    }

    /**
     * 修改管理员资料接口
     * @param adminProfileUpdateDTO 包含管理员新资料的传输对象
     * @param request HTTP请求对象，包含管理员ID信息
     * @return 更新后的管理员资料视图对象，包含更新后的用户名、角色等信息
     */
    @Operation(summary = "修改管理员资料",description = "管理员点击更新资料按钮，系统会根据管理员输入的资料信息更新管理员的用户名、角色等信息")
    @PutMapping("/profile")
    public Result updateProfile(@Valid @RequestBody AdminProfileUpdateDTO adminProfileUpdateDTO, HttpServletRequest request){
        //从请求中获取管理员ID
        Long adminId = resolveAdminId(request);

        // 记录修改管理员资料请求日志
        log.info("收到修改管理员资料请求，adminId={}", adminId);

        //调用修改管理员资料方法
        AdminVO adminVO = adminService.updateProfile(adminId, adminProfileUpdateDTO);

        // 记录修改管理员资料成功日志
        log.info("修改管理员资料成功，adminId={}", adminId);

        //返回成功响应
        return Result.success(adminVO);
    }

    /**
     * 修改管理员密码接口
     * @param adminPasswordChangeDTO 包含管理员旧密码和新密码的传输对象
     * @param request HTTP请求对象，包含管理员ID信息
     * @return 修改密码成功消息
     */
    @Operation(summary = "修改管理员密码",description = "管理员点击修改密码按钮，系统会根据管理员输入的旧密码和新密码更新管理员的密码")
    @PatchMapping("/profile/password")
    public Result changePassword(@Valid @RequestBody AdminPasswordChangeDTO adminPasswordChangeDTO,
                                 HttpServletRequest request){
        //从请求中获取管理员ID
        Long adminId = resolveAdminId(request);

        // 记录修改管理员密码请求日志
        log.info("收到修改管理员密码请求，adminId={}", adminId);

        //调用changePassword方法
        adminService.changePassword(adminId, adminPasswordChangeDTO);

        // 记录修改管理员密码成功日志
        log.info("修改管理员密码成功，adminId={}", adminId);

        //返回成功响应
        Result result = Result.success();
        result.setMsg("密码修改成功");

        return result;
    }
    /**
     * 验证管理员登录状态接口
     * @return 管理员登录状态
     */
    @Operation(summary = "验证管理员登录状态",description = "管理员点击验证登录状态按钮，系统会返回当前登录管理员的登录状态")
    @GetMapping("/validate")
    public Result validateToken(){
        /*
         * 笔记：[Spring] Map.of
         * Java 9+ 的不可变 Map 工厂方法，一次调用生成只读 Map，调用后不可增删改，否则抛 UnsupportedOperationException。
         * 适合 {valid:true}、{token:"..."} 这类字段很少的一次性响应，比 new HashMap 再 put 简洁。
         * 复杂或复用的响应对象仍应定义 VO，不要用 Map.of 凑结构。
         */
        // 记录验证管理员登录状态请求日志
        log.info("收到验证管理员登录状态请求");

        // 返回登录状态
        return Result.success(Map.of("valid", true));
    }

    /**
     * 刷新管理员登录接口
     * @param request HTTP请求对象，包含管理员ID信息
     * @return 刷新后的Token视图对象，包含刷新后的Token信息
     */
    @Operation(summary = "刷新管理员登录Token",description = "管理员点击刷新登录Token按钮，系统会返回新的登录Token")
    @PostMapping("/refresh")
    public Result refreshToken(HttpServletRequest request){

        // 从请求中获取管理员ID
        Long adminId = resolveAdminId(request);

        // 记录刷新管理员Token请求日志
        log.info("收到刷新管理员Token请求，adminId={}", adminId);

        // 调用服务层方法刷新 Token
        String token = adminService.refreshToken(adminId);

        // 记录刷新管理员Token成功日志
        log.info("刷新管理员Token成功，adminId={}", adminId);

        // 返回刷新后的 Token
        return Result.success(Map.of("token", token));
    }

    @GetMapping("/captcha")
    public Result captcha(HttpServletRequest request){

        String clientIP = JakartaServletUtil.getClientIP(request);
        log.info("收到验证码请求，clientIP={}", clientIP);

        //获取验证码
        AdminCaptchaVO captchaVO = adminService.createCaptcha(clientIP);


        return Result.success(captchaVO);
    }

    /**
     * 从请求上下文中解析管理员ID
     * @param request HTTP请求对象
     * @return 管理员ID
     */
    private Long resolveAdminId(HttpServletRequest request) {
        Long adminId = (Long) request.getAttribute("adminId");
        if (adminId == null) {
            log.warn("请求上下文中未找到管理员ID");
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "未登录或登录已过期");
        }
        return adminId;
    }

}
