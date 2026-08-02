package com.xinmengqaq.springboot.article.exception;

import lombok.Getter;

@Getter
public class ArticleLikeRateLimitException extends RuntimeException {

    private final long retryAfterSeconds;

    public ArticleLikeRateLimitException(long retryAfterSeconds) {
        super("操作过于频繁，请稍后再试");
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
