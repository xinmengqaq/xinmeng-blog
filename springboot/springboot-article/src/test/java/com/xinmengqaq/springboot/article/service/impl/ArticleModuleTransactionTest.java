package com.xinmengqaq.springboot.article.service.impl;

import com.xinmengqaq.springboot.article.dto.ArticleDTO;
import com.xinmengqaq.springboot.article.dto.CategoryUpdateDTO;
import com.xinmengqaq.springboot.article.dto.TagUpdateDTO;
import com.xinmengqaq.springboot.article.entity.Category;
import com.xinmengqaq.springboot.article.entity.Tag;
import com.xinmengqaq.springboot.article.mapper.CategoryMapper;
import com.xinmengqaq.springboot.article.mapper.TagMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class ArticleModuleTransactionTest {

    @Test
    @DisplayName("文章模块写操作对受检异常配置事务回滚")
    void transactionMethodsRollBackForCheckedExceptions() throws NoSuchMethodException {
        assertRollsBackForCheckedException(
                ArticleServiceImpl.class, "updateById", Long.class, ArticleDTO.class);
        assertRollsBackForCheckedException(
                ArticleServiceImpl.class, "deleteById", Long.class);
        assertRollsBackForCheckedException(
                ArticleServiceImpl.class, "deleteByIds", List.class);
        assertRollsBackForCheckedException(
                CategoryServiceImpl.class, "updateById", Long.class, CategoryUpdateDTO.class);
        assertRollsBackForCheckedException(
                CategoryServiceImpl.class, "deleteById", Long.class);
        assertRollsBackForCheckedException(
                TagServiceImpl.class, "updateById", long.class, TagUpdateDTO.class);
        assertRollsBackForCheckedException(
                TagServiceImpl.class, "deleteById", Long.class);
    }

    @Test
    @DisplayName("删除分类时先锁定分类记录再校验文章数量")
    void deleteCategoryLocksCategoryBeforeCheckingArticleCount() {
        List<String> mapperCalls = new ArrayList<>();
        Category category = new Category();
        category.setId(1L);

        CategoryMapper categoryMapper = mock(CategoryMapper.class, invocation -> {
            String methodName = invocation.getMethod().getName();
            mapperCalls.add(methodName);
            if (methodName.startsWith("selectById")) {
                return category;
            }
            if (methodName.equals("countArticleByCategoryId")) {
                return 0L;
            }
            if (methodName.equals("deleteById")) {
                return 1;
            }
            return null;
        });

        CategoryServiceImpl categoryService = new CategoryServiceImpl();
        ReflectionTestUtils.setField(categoryService, "categoryMapper", categoryMapper);

        categoryService.deleteById(1L);

        assertThat(mapperCalls).contains("selectByIdForUpdate");
    }

    @Test
    @DisplayName("删除标签时先锁定标签记录再校验文章数量")
    void deleteTagLocksTagBeforeCheckingArticleCount() {
        List<String> mapperCalls = new ArrayList<>();
        Tag tag = new Tag();
        tag.setId(1L);

        TagMapper tagMapper = mock(TagMapper.class, invocation -> {
            String methodName = invocation.getMethod().getName();
            mapperCalls.add(methodName);
            if (methodName.startsWith("selectById")) {
                return tag;
            }
            if (methodName.equals("countArticleByTagId")) {
                return 0L;
            }
            if (methodName.equals("deleteById")) {
                return 1;
            }
            return null;
        });

        TagServiceImpl tagService = new TagServiceImpl();
        ReflectionTestUtils.setField(tagService, "tagMapper", tagMapper);

        tagService.deleteById(1L);

        assertThat(mapperCalls).contains("selectByIdForUpdate");
    }

    private void assertRollsBackForCheckedException(
            Class<?> serviceClass, String methodName, Class<?>... parameterTypes) throws NoSuchMethodException {
        Method method = serviceClass.getMethod(methodName, parameterTypes);
        Transactional transactional = method.getAnnotation(Transactional.class);

        assertThat(transactional).isNotNull();
        assertThat(transactional.rollbackFor()).contains(Exception.class);
    }
}
