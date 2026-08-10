package com.xinmengqaq.springboot.user.task;

import com.xinmengqaq.springboot.user.service.impl.BlogUserDeletionServiceImpl;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.concurrent.TimeUnit;

/**
 * 待删除用户的定时清理入口。
 */
@Component
@EnableScheduling
public class BlogUserDeletionScheduler {

    private final BlogUserDeletionServiceImpl deletionService;

    public BlogUserDeletionScheduler(BlogUserDeletionServiceImpl deletionService) {
        this.deletionService = deletionService;
    }

    /**
     * 每小时触发一个有限删除批次，不在单次调度中循环占用事务。
     */
    @Scheduled(fixedDelay = 1, initialDelay = 1, timeUnit = TimeUnit.HOURS)
    public void deleteExpiredAccounts() {
        deletionService.deleteExpiredAccounts(OffsetDateTime.now());
    }
}
