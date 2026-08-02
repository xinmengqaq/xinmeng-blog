package com.xinmengqaq.springboot.article.controller;


import com.xinmengqaq.springboot.article.dto.*;
import com.xinmengqaq.springboot.article.service.ArticleService;
import com.xinmengqaq.springboot.article.vo.ArticleDetailVO;
import com.xinmengqaq.springboot.article.vo.ArticleListVO;
import com.xinmengqaq.springboot.article.vo.ArticleVO;
import com.xinmengqaq.springboot.common.PageResult;
import com.xinmengqaq.springboot.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@Tag(name = "文章模块/文章管理", description = "后台文章管理接口")
@RestController
@RequestMapping("/api/admin/articles")
public class ArticleController {

    @Resource
    private ArticleService articleService;

    /**
     * 查询文章详情
     * @param id 文章 ID
     * @return 文章详情
     */
    @Operation(summary = "查询文章详情", description = "后台根据文章 ID 查询文章标题、摘要、正文、状态等详情")
    @GetMapping("/{id}")
    public Result detail(@PathVariable("id") Long id) {
        /*
         * 笔记：[SpringMVC] @PathVariable
         * 从 URL 路径占位符 {id} 中提取值绑定到方法参数，适合 RESTful 风格的 /articles/{id} 路由。
         * 参数名和占位符名一致时可省略 ("id")，不一致时必须写 @PathVariable("路径名")。
         * 和 @RequestParam 区别：@PathVariable 取路径里的值，@RequestParam 取 query 串 ?key=value 的值。
         */
        log.info("【Controller】接收到查询文章详情请求, id={}", id);

        ArticleDetailVO articleDetailVO = articleService.selectDetailById(id);

        log.info("【Controller】查询文章详情成功, id={}, title={}", id, articleDetailVO.getTitle());
        return Result.success(articleDetailVO);
    }

    /**
     * 新增文章
     * @param dto 文章保存请求体
     * @return 新增的文章ID
     */
    @Operation(summary = "新增文章", description = "后台新增文章，支持草稿、已发布、隐藏三种状态")
    @PostMapping
    public Result save(@Validated @RequestBody ArticleDTO dto) {
        log.info("【Controller】接收到新增文章请求, title={}, status={}", dto.getTitle(), dto.getStatus());

        Long id = articleService.save(dto);

        log.info("【Controller】新增文章成功, id={}", id);
        return Result.success(Map.of("id", id));
    }


    /**
     * 修改文章
     * @param id 文章 ID
     * @param dto 文章修改请求体
     * @return 修改后的文章详情
     */
    @Operation(summary = "修改文章", description = "后台根据文章 ID 修改文章标题、摘要、正文、封面、状态等基础字段")
    @PutMapping("/{id}")
    public Result update(@PathVariable("id") Long id, @Validated @RequestBody ArticleDTO dto) {
        log.info("【Controller】接收到修改文章请求, id={}, title={}", id, dto.getTitle());

        ArticleVO articleVO = articleService.updateById(id, dto);

        log.info("【Controller】修改文章成功, id={}", id);
        return Result.success(articleVO);
    }

    /**
     * 删除文章
     * @param id 文章 ID
     * @return 删除结果
     */
    @Operation(summary = "删除文章", description = "后台根据文章 ID 删除文章")
    @DeleteMapping("/{id}")
    public Result deleteById(@PathVariable("id") Long id) {
        log.info("【Controller】接收到删除文章请求, id={}", id);

        articleService.deleteById(id);


        log.info("【Controller】删除文章成功, id={}", id);

        Result result = Result.success();
        result.setMsg("删除成功");

        return result;
    }

    /**
     * 批量删除文章
     * @param dto 批量删除请求体
     * @return 实际删除数量
     */
    @Operation(summary = "批量删除文章", description = "后台批量删除文章并同步清理文章标签关联")
    @PostMapping("/batch-delete")
    public Result batchDelete(@Validated @RequestBody ArticleBatchDeleteDTO dto) {
        log.info("【Controller】接收到批量删除文章请求, requestedCount={}", dto.getIds().size());

        int deletedCount = articleService.deleteByIds(dto.getIds());

        Result result = Result.success(Map.of("deletedCount", deletedCount));
        result.setMsg("删除成功");
        return result;
    }

    @Operation(summary = "分页查询文章", description = "后台分页查询文章列表")
    @GetMapping
    public Result page(@Validated @ParameterObject ArticlePageQueryDTO queryDTO) {
        /*
         * 笔记：[SpringMVC] @ParameterObject
         * SpringDoc 提供的注解，把 GET 请求的 query 参数自动绑定到 DTO 字段，同时让 Swagger 文档识别为结构化参数。
         * 不加 @ParameterObject 时，GET 请求的 DTO 需要逐个字段写 @RequestParam，或靠 @ModelAttribute 隐式绑定。
         * 配合 @Validated 触发 DTO 上的 @Min/@Max/@Size 等校验，校验失败抛 ConstraintViolationException。
         */
        log.info(
                "【Controller】接收到分页查询文章请求, page={}, size={}",
                queryDTO.getPage(),
                queryDTO.getSize()
        );

        PageResult<ArticleListVO> pageResult = articleService.selectPage(queryDTO);
        return Result.success(pageResult);
    }

    /**
     * 更新文章状态
     * @param id 文章 ID
     * @param dto 文章状态更新请求体
     * @return 更新结果
     */
    @Operation(summary = "更新文章状态", description = "后台根据文章 ID 更新文章状态，支持草稿、已发布、隐藏三种状态")
    @PatchMapping("/{id}/status")
    public Result updateStatus(@PathVariable("id") Long id, @Validated @RequestBody ArticleStatusUpdateDTO dto) {
        log.info("【Controller】接收到更新文章状态请求, id={}, status={}", id, dto.getStatus());

        articleService.updateStatus(id, dto.getStatus());

        Result result = Result.success();
        result.setMsg("状态已更新");

        return result;
    }

    /**
     * 更新文章置顶状态
     * @param id 文章 ID
     * @param dto 文章置顶更新请求体
     * @return 更新结果
     */
    @Operation(summary = "更新文章置顶状态", description = "后台根据文章 ID 更新文章置顶状态")
    @PatchMapping("/{id}/top")
    public Result updateTop(
            @PathVariable("id") Long id,
            @Validated @RequestBody ArticleTopUpdateDTO dto
    ) {
        log.info("【Controller】接收到更新文章置顶状态请求, id={}, isTop={}", id, dto.getIsTop());
        articleService.updateTop(id, dto.getIsTop());

        log.info("【Controller】更新文章置顶状态成功, id={}", id);
        Result result = Result.success();
        result.setMsg("置顶状态已更新");
        return result;
    }

    /**
     * 更新文章推荐状态
     * @param id 文章 ID
     * @param dto 文章推荐更新请求体
     * @return 更新结果
     */
    @Operation(summary = "更新文章推荐状态", description = "后台根据文章 ID 更新文章推荐状态")
    @PatchMapping("/{id}/recommend")
    public Result updateRecommend(
            @PathVariable("id") Long id,
            @Validated @RequestBody ArticleRecommendUpdateDTO dto
    ) {
        log.info("【Controller】接收到更新文章推荐状态请求, id={}, isRecommend={}", id, dto.getIsRecommend());
        articleService.updateRecommend(id, dto.getIsRecommend());

        log.info("【Controller】更新文章推荐状态成功, id={}", id);
        Result result = Result.success();
        result.setMsg("推荐状态已更新");
        return result;
    }
}
