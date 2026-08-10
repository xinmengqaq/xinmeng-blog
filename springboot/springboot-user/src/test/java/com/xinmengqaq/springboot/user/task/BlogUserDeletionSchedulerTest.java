package com.xinmengqaq.springboot.user.task;

import com.xinmengqaq.springboot.user.service.impl.BlogUserDeletionServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.annotation.Scheduled;

import java.lang.reflect.Method;
import java.time.OffsetDateTime;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class BlogUserDeletionSchedulerTest {

    @Test
    @DisplayName("账号清理任务每小时只触发一个删除批次")
    void scheduledDeletionRunsOneBatchEveryHour() throws Exception {
        BlogUserDeletionServiceImpl service = mock(BlogUserDeletionServiceImpl.class);
        BlogUserDeletionScheduler scheduler = new BlogUserDeletionScheduler(service);

        scheduler.deleteExpiredAccounts();

        verify(service).deleteExpiredAccounts(any(OffsetDateTime.class));
        Method method = BlogUserDeletionScheduler.class.getMethod("deleteExpiredAccounts");
        Scheduled scheduled = method.getAnnotation(Scheduled.class);
        assertThat(scheduled).isNotNull();
        assertThat(scheduled.fixedDelay()).isEqualTo(1L);
        assertThat(scheduled.initialDelay()).isEqualTo(1L);
        assertThat(scheduled.timeUnit()).isEqualTo(TimeUnit.HOURS);
    }
}
