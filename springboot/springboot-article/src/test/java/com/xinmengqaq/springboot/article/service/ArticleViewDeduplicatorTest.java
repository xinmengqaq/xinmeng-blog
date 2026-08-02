package com.xinmengqaq.springboot.article.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class ArticleViewDeduplicatorTest {

    @Test
    @DisplayName("同一访客在缓存有效期内重复访问同一文章只允许首次计数")
    void testShouldCountOnlyFirstVisitForSameArticleAndVisitor() {
        ArticleViewDeduplicator deduplicator = createDeduplicator();

        assertThat(deduplicator.shouldCount(1L, "visitor-hash")).isTrue();
        assertThat(deduplicator.shouldCount(1L, "visitor-hash")).isFalse();
        assertThat(deduplicator.shouldCount(2L, "visitor-hash")).isTrue();
        assertThat(deduplicator.shouldCount(1L, "another-visitor-hash")).isTrue();
    }

    @Test
    @DisplayName("浏览量写入失败后撤销标记允许同一访客重新计数")
    void testRollbackAllowsRetry() {
        ArticleViewDeduplicator deduplicator = createDeduplicator();

        assertThat(deduplicator.shouldCount(1L, "visitor-hash")).isTrue();
        deduplicator.rollback(1L, "visitor-hash");

        assertThat(deduplicator.shouldCount(1L, "visitor-hash")).isTrue();
    }

    private ArticleViewDeduplicator createDeduplicator() {
        Cache<String, Boolean> cache = Caffeine.newBuilder().build();
        ArticleViewDeduplicator deduplicator = new ArticleViewDeduplicator();
        ReflectionTestUtils.setField(deduplicator, "articleViewCache", cache);
        return deduplicator;
    }
}
