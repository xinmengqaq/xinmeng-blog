package com.xinmengqaq.springboot.article.service.impl;

import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.xinmengqaq.springboot.article.aspect.annotation.ArticleOperation;
import com.xinmengqaq.springboot.article.aspect.enums.ArticleAction;
import com.xinmengqaq.springboot.article.dto.ArticleDTO;
import com.xinmengqaq.springboot.article.dto.ArticlePageQueryDTO;
import com.xinmengqaq.springboot.article.entity.Article;
import com.xinmengqaq.springboot.article.entity.ArticleTag;
import com.xinmengqaq.springboot.article.mapper.ArticleMapper;
import com.xinmengqaq.springboot.article.mapper.ArticleTagMapper;
import com.xinmengqaq.springboot.article.mapper.CategoryMapper;
import com.xinmengqaq.springboot.article.mapper.TagMapper;
import com.xinmengqaq.springboot.article.service.ArticleService;
import com.xinmengqaq.springboot.article.vo.ArticleDetailVO;
import com.xinmengqaq.springboot.article.vo.ArticleListVO;
import com.xinmengqaq.springboot.article.vo.ArticleVO;
import com.xinmengqaq.springboot.article.vo.TagVO;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.PageResult;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;


@Slf4j
@Service
public class ArticleServiceImpl implements ArticleService {

    @Resource
    private ArticleMapper articleMapper;

    @Resource
    private CategoryMapper categoryMapper;

    @Resource
    private TagMapper tagMapper;

    @Resource
    private ArticleTagMapper articleTagMapper;

    /**
     * 新增文章
     * @param articleDTO 文章保存DTO
     * @return 新增的文章ID
     */
    @Override
    @Transactional(rollbackFor = Exception.class) //添加事务注解，确保文章新增和标签关联操作原子性，rollbackFor指定回滚异常类型,默认回滚运行时异常
    public Long save(ArticleDTO articleDTO) {
        log.info("【Service】开始新增文章, title={}", articleDTO.getTitle());

        // 校验分类是否存在
        if (articleDTO.getCategoryId() != null
                && categoryMapper.selectById(articleDTO.getCategoryId()) == null) {
            log.warn("【Service】新增文章失败，分类不存在, categoryId={}", articleDTO.getCategoryId());
            throw new BusinessException(ErrorCode.NOT_FOUND, "分类不存在");
        }

        // 校验标签是否存在
        List<Long> tagIds = checkTagExist(articleDTO);

        // DTO 转 Entity
        Article article = convertToEntity(articleDTO);

        // 设置时间字段
        OffsetDateTime now = OffsetDateTime.now();
        article.setCreatedAt(now);
        article.setUpdatedAt(now);

        // 已发布状态才填充发布时间
        if ("published".equals(articleDTO.getStatus())) {
            article.setPublishedAt(now);
        }

        // 入库
        int rows = articleMapper.insert(article);
        if (rows != 1 || article.getId() == null) {
            log.error("【Service】新增文章失败, title={}", articleDTO.getTitle());
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "新增文章失败");
        }

        // 组装关联标签类列表,如果标签id列表为空,则不关联标签
        if (!tagIds.isEmpty()) {
            List<ArticleTag> articleTags = getArticleTagList(tagIds, article);

            //批量插入关联标签
            batchInsertTags(articleDTO, articleTags);
        }

        log.info("【Service】新增文章成功, id={}, title={}", article.getId(), articleDTO.getTitle());
        return article.getId();
    }


    /**
     * 根据文章ID修改文章
     * @param id 文章ID
     * @param dto 文章保存DTO
     * @return 修改后的文章详情VO
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArticleVO updateById(Long id, ArticleDTO dto) {

        log.info("【Service】开始修改文章, id={}, title={}", id, dto.getTitle());

        //检验分类是否存在
        if (dto.getCategoryId() != null
                && categoryMapper.selectById(dto.getCategoryId()) == null) {
            log.warn("【Service】修改文章失败，分类不存在, id={}, categoryId={}", id, dto.getCategoryId());
            throw new BusinessException(ErrorCode.NOT_FOUND, "分类不存在");
        }

        // 校验标签是否存在
        List<Long> tagIds = checkTagExist(dto);

        Article article = convertToEntity(dto);

        article.setUpdatedAt(OffsetDateTime.now());
        article.setId(id);

        int rows = articleMapper.updateById(article);
        if (rows != 1) {
            log.warn("【Service】修改文章失败，文章不存在, id={}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
        }

        //删除关联标签
        articleTagMapper.deleteByArticleId(id);

        //调用组装关联标签类列表,如果标签id列表为空,则不关联标签
        if (!tagIds.isEmpty()) {
            List<ArticleTag> articleTags = getArticleTagList(tagIds, article);

            //批量插入关联标签
            batchInsertTags(dto, articleTags);

        }

        log.info("【Service】修改文章数据库操作完成, id={}", id);
        return selectById(id);
    }

    /**
     * 根据文章ID删除文章
     * @param id 文章ID
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteById(Long id) {
        log.info("【Service】开始删除文章, id={}", id);

        articleTagMapper.deleteByArticleId(id);

        int rows = articleMapper.deleteById(id);
        if (rows != 1) {
            log.warn("【Service】删除文章失败，文章不存在, id={}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
        }

        log.info("【Service】删除文章成功, id={}", id);
    }

    /**
     * 批量删除文章
     * @param ids 文章 ID 列表
     * @return 实际删除数量
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int deleteByIds(List<Long> ids) {
        List<Long> distinctIds = new LinkedHashSet<>(ids).stream().toList();
        log.info("【Service】开始批量删除文章, requestedCount={}, distinctCount={}", ids.size(), distinctIds.size());

        articleTagMapper.deleteByArticleIds(distinctIds);
        int deletedCount = articleMapper.deleteByIds(distinctIds);

        log.info("【Service】批量删除文章成功, deletedCount={}", deletedCount);
        return deletedCount;
    }

    @ArticleOperation(ArticleAction.PAGE_QUERY)
    @Override
    public PageResult<ArticleListVO> selectPage(ArticlePageQueryDTO queryDTO) {
        log.info(
                "【Service】开始分页查询文章, page={}, size={}",
                queryDTO.getPage(),
                queryDTO.getSize()
        );

        /*
         * 笔记：[MyBatis] PageHelper.startPage
         * PageHelper 的分页拦截器入口，通过 ThreadLocal 把分页参数（页码、每页条数）暂存到当前线程。
         * 必须紧挨着放在 Mapper 查询方法的前一行：拦截器拦截下一条 SQL 自动拼上 LIMIT/COUNT，查完自动清理 ThreadLocal。
         * 中间穿插其他代码会导致分页参数被错误消费；查完结果用 PageInfo 包装即可拿到列表、总数、总页数。
         */
        PageHelper.startPage(queryDTO.getPage(), queryDTO.getSize());
        PageInfo<ArticleListVO> pageInfo = new PageInfo<>(articleMapper.selectPage(queryDTO));
        return PageResult.of(pageInfo, articleListVO -> articleListVO);
    }

    /**
     * 根据文章ID查询文章详情
     * @param id 文章ID
     * @return 文章详情VO
     */
    @ArticleOperation(ArticleAction.DETAIL_QUERY)
    @Override
    public ArticleDetailVO selectDetailById(Long id) {
        log.info("【Service】开始查询文章详情, id={}", id);

        ArticleDetailVO articleDetailVO = articleMapper.selectDetailById(id);
        if (articleDetailVO == null) {
            log.warn("【Service】查询文章详情失败，文章不存在, id={}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
        }

        List<TagVO> tagVOList = articleTagMapper.selectTagsByArticleId(id);
        articleDetailVO.setTags(tagVOList);

        log.info("【Service】查询文章详情成功, id={}, title={}", id, articleDetailVO.getTitle());

        return articleDetailVO;
    }

    /**
     * 更新文章状态
     * @param id 文章 ID
     * @param status 文章状态：draft、published、hidden
     */
    @ArticleOperation(ArticleAction.UPDATE_STATUS)
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateStatus(Long id, String status) {
        log.info("【Service】开始更新文章状态, id={}, status={}", id, status);

        int rows = articleMapper.updateStatus(
                id,
                status,
                OffsetDateTime.now()
        );

        if (rows != 1) {
            log.warn("【Service】更新文章状态失败，文章不存在, id={}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
        }

        log.info("【Service】文章状态更新成功, id={}, status={}", id, status);
    }

    /**
     * 更新文章置顶状态
     * @param id 文章 ID
     * @param isTop 是否置顶
     */
    @ArticleOperation(ArticleAction.UPDATE_TOP)
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateTop(Long id, Boolean isTop) {
        log.info("【Service】开始更新文章置顶状态, id={}, isTop={}", id, isTop);

        int rows = articleMapper.updateTop(id, isTop, OffsetDateTime.now());
        if (rows != 1) {
            log.warn("【Service】更新文章置顶状态失败，文章不存在, id={}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
        }

        log.info("【Service】文章置顶状态更新成功, id={}, isTop={}", id, isTop);
    }

    /**
     * 更新文章推荐状态
     * @param id 文章 ID
     * @param isRecommend 是否推荐
     */
    @ArticleOperation(ArticleAction.UPDATE_RECOMMEND)
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateRecommend(Long id, Boolean isRecommend) {
        log.info(
                "【Service】开始更新文章推荐状态, id={}, isRecommend={}",
                id,
                isRecommend
        );

        int rows = articleMapper.updateRecommend(
                id,
                isRecommend,
                OffsetDateTime.now()
        );

        if (rows != 1) {
            log.warn("【Service】更新文章推荐状态失败，文章不存在, id={}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
        }

        log.info(
                "【Service】文章推荐状态更新成功, id={}, isRecommend={}",
                id,
                isRecommend
        );
    }

    /**
     * 校验标签是否存在
     * @param articleDTO 文章保存DTO
     */
    private List<Long> checkTagExist(ArticleDTO articleDTO) {

        List<Long> tagIds = articleDTO.getTagIds() == null ? List.of() : articleDTO.getTagIds();

        if (tagIds.stream().anyMatch(Objects::isNull)) {
            log.warn("【Service】修改文章失败，标签ID不能为空");
            throw new BusinessException(ErrorCode.PARAM_ERROR, "标签ID不能为空");
        }

        Set<Long> tagIdSet = new HashSet<>(tagIds);
        if (tagIdSet.size() != tagIds.size()) {
            log.warn("【Service】修改文章失败，标签ID不能重复");
            throw new BusinessException(ErrorCode.PARAM_ERROR, "标签ID不能重复");
        }

        if (!tagIds.isEmpty()) {
            Long existingTagCount = tagMapper.countByIds(tagIds);
            if (existingTagCount == null || existingTagCount != tagIds.size()) {
                log.warn("【Service】修改文章失败，标签不存在, tagIds={}", tagIds);
                throw new BusinessException(ErrorCode.NOT_FOUND, "标签不存在");
            }
        }

        return tagIds;
    }

    /**
     * 转换文章保存DTO为文章实体
     * @param dto 文章保存DTO
     * @return 文章实体
     */
    private Article convertToEntity(ArticleDTO dto) {
        Article article = new Article();
        BeanUtils.copyProperties(dto, article);
        return article;
    }


    /**
     * 组装文章标签关联列表
     * @param tagIds 标签ID列表
     * @param article 文章实体
     * @return 文章标签关联列表
     */
    private static @NonNull List<ArticleTag> getArticleTagList(List<Long> tagIds, Article article) {

        return tagIds.stream()
                .map(tagId -> {
                    ArticleTag articleTag = new ArticleTag();
                    articleTag.setArticleId(article.getId());
                    articleTag.setTagId(tagId);
                    return articleTag;
                })
                .toList();

    }


    /**
     * 批量新增文章标签关联
     * @param articleDTO 文章保存DTO
     * @param articleTags 文章标签关联列表
     */
    private void batchInsertTags(ArticleDTO articleDTO, List<ArticleTag> articleTags) {
        int tagRows = articleTagMapper.batchInsert(articleTags);
        if (tagRows != articleTags.size()) {
            log.warn("【Service】新增文章失败，标签关联失败, title={}", articleDTO.getTitle());
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "标签关联失败");
        }
    }


    /**
     * 根据文章ID查询文章详情
     * @param id 文章ID
     * @return 文章详情VO
     */
    public ArticleVO selectById(Long id) {
        log.info("【Service】开始查询文章, id={}", id);

        Article article = articleMapper.selectById(id);
        log.info("【Service】Mapper查询完成, id={}, result={}", id, article != null ? "存在" : "不存在");

        if (article == null) {
            log.warn("【Service】文章不存在, id={}", id);
            throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");
        }

        ArticleVO articleVO = ArticleVO.fromArticle(article);
        log.info("【Service】文章详情转换完成, id={}, title={}", id, articleVO.getTitle());
        return articleVO;
    }
}
