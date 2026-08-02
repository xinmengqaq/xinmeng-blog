package com.xinmengqaq.springboot.article.controller;

import com.xinmengqaq.springboot.article.dto.TagCreateDTO;
import com.xinmengqaq.springboot.article.dto.TagQueryDTO;
import com.xinmengqaq.springboot.article.dto.TagUpdateDTO;
import com.xinmengqaq.springboot.article.service.TagService;
import com.xinmengqaq.springboot.article.vo.TagVO;
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
@Tag(name = "文章模块/标签管理", description = "后台文章标签管理接口")
@RestController
@RequestMapping("/api/admin/tags")
public class TagController {

    @Resource
    private TagService tagService;

    /**
     * 查询标签列表
     * @param queryDTO 标签查询DTO
     * @return 标签列表VO
     */
    @Operation(summary = "查询标签列表", description = "后台查询文章标签列表，支持标签名关键词筛选，并返回关联文章数量")
    @GetMapping
    public Result list(@Validated @ParameterObject TagQueryDTO queryDTO) {

        log.info("【Controller】接收到查询标签列表请求, keyword={}", queryDTO.getKeyword());

        //2.调用业务层查询标签列表
        List<TagVO> tagVOList = tagService.list(queryDTO);

        return Result.success(tagVOList);
    }

    /**
     * 新增标签
     * @param createDTO 标签创建DTO
     * @return 新增的标签ID
     */
    @Operation(summary = "新增标签", description = "后台创建文章标签，返回新标签 ID")
    @PostMapping
    public  Result insert(@Validated @RequestBody TagCreateDTO createDTO) {
        log.info("【Controller】接收到新增标签请求, name={}", createDTO.getName());

        Long id = tagService.insert(createDTO);

        log.info("【Controller】新增标签成功, id={}", id);

        return Result.success(Map.of("id", id));
    }

    /**
     * 修改标签
     * @param id 标签ID
     * @param createDTO 标签更新DTO
     * @return 更新后的标签VO
     */
    @Operation(summary = "修改标签", description = "后台根据标签 ID 修改标签名称")
    @PutMapping("/{id}")
    public Result updateById(@PathVariable Long id, @Validated @RequestBody TagUpdateDTO updateDTO) {

        log.info("【Controller】接收到更新标签请求, id={}, name={}", id, updateDTO.getName());

        TagVO tagVO = tagService.updateById(id, updateDTO);

        return Result.success(tagVO);
    }

    /**
     * 根据标签ID删除标签
     * @param id 标签ID
     * @return 删除结果
     */
    @Operation(summary = "删除标签", description = "后台根据标签 ID 删除标签，标签正在被文章使用时不允许删除")
    @DeleteMapping("/{id}")
    public Result deleteById(@PathVariable Long id) {
        log.info("【Controller】接收到删除标签请求, id={}", id);

        tagService.deleteById(id);

        log.info("【Controller】删除标签成功, id={}", id);

        Result result = Result.success();
        result.setMsg("删除成功");

        return result;
    }
}
