package com.xinmengqaq.springboot.article.service;

import com.github.benmanes.caffeine.cache.Cache;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Component;

@Component
public class ArticleViewDeduplicator {

    @Resource(name = "articleViewCache")
    private Cache<String, Boolean> articleViewCache;

    public boolean shouldCount(Long articleId, String visitorHash) {
        return articleViewCache.asMap().putIfAbsent(buildKey(articleId, visitorHash), Boolean.TRUE) == null;
    }

    public void rollback(Long articleId, String visitorHash) {
        articleViewCache.invalidate(buildKey(articleId, visitorHash));
    }

    private String buildKey(Long articleId, String visitorHash) {
        return articleId + ":" + visitorHash;
    }
}
