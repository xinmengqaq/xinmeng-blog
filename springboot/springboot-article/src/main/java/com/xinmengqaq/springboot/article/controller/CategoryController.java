package com.xinmengqaq.springboot.article.controller;

import com.xinmengqaq.springboot.article.dto.CategoryCreateDTO;
import com.xinmengqaq.springboot.article.dto.CategoryQueryDTO;
import com.xinmengqaq.springboot.article.dto.CategoryUpdateDTO;
import com.xinmengqaq.springboot.article.service.CategoryService;
import com.xinmengqaq.springboot.article.vo.CategoryVO;
import com.xinmengqaq.springboot.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@Tag(name = "文章模块/分类管理", description = "后台文章分类管理接口")
@RestController
@RequestMapping("/api/admin/categories")
public class CategoryController {

    @Resource
    private CategoryService categoryService;

    /**
     * 查询分类列表
     * @param queryDTO 分类查询 DTO
     * @return 分类列表VO
     */
    @Operation(summary = "查询分类列表", description = "后台查询文章分类列表，支持状态筛选，并返回分类关联文章数量")
    @GetMapping
    public Result list(@Validated @ParameterObject CategoryQueryDTO queryDTO) {

        //1. 记录接受请求日志
        log.info("【Controller】接收到查询分类列表请求, status={}", queryDTO.getStatus());

        //2.调用业务层查询分类列表
        List<CategoryVO> categoryVO = categoryService.list(queryDTO);

        //3.记录查询日志
        log.info("查询所有分类，查询结果：{}", categoryVO);

        //4. 把查到的分类返回给前端以VO格式返回
        return Result.success(categoryVO);
    }

    /**
     * 创建增分类
     * @param createDTO 分类创建 DTO
     * @return 分类 ID
     */
    @Operation(summary = "新增分类", description = "后台创建文章分类，返回新分类 ID")
    @PostMapping
    public Result insert(@Validated @RequestBody CategoryCreateDTO createDTO) {

        log.info("【Controller】接收到创建分类请求, name={}, description={}, sortOrder={}, status={}",
                createDTO.getName(), createDTO.getDescription(), createDTO.getSortOrder(), createDTO.getStatus());

        Long id = categoryService.insert(createDTO);

        log.info("创建分类成功，分类名称：{}", createDTO.getName());

        return Result.success(Map.of("id", id));
    }

    /**
     * 更新分类
     * @param id 分类ID
     * @param updateDTO 分类更新 DTO
     * @return 更新结果
     */
    @Operation(summary = "修改分类", description = "后台根据分类 ID 修改分类名称、描述、排序和状态")
    @PutMapping("/{id}")
    public Result updateById(@PathVariable Long id, @Validated @RequestBody CategoryUpdateDTO updateDTO) {
        log.info("【Controller】接收到更新分类请求, id={}, name={}, description={}, sortOrder={}, status={}",
                id, updateDTO.getName(), updateDTO.getDescription(), updateDTO.getSortOrder(), updateDTO.getStatus());

        CategoryVO categoryVO = categoryService.updateById(id, updateDTO);

        log.info("更新分类成功，分类ID：{}", id);

        return Result.success(categoryVO);
    }

    /**
     * 删除分类
     * @param id 分类ID
     * @return 删除结果
     */
    @Operation(summary = "删除分类", description = "后台根据分类 ID 删除分类，分类下存在文章时不允许删除")
    @DeleteMapping("/{id}")
    public Result deleteById(@PathVariable Long id) {

        categoryService.deleteById(id);

        Result result = Result.success();
        result.setMsg("删除成功");

        return result;
    }
}
