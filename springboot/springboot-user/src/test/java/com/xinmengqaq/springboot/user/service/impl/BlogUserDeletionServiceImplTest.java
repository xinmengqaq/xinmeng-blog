package com.xinmengqaq.springboot.user.service.impl;

import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogUserDeletionServiceImplTest {

    @Mock
    private BlogUserMapper blogUserMapper;

    @InjectMocks
    private BlogUserDeletionServiceImpl deletionService;

    @Test
    @DisplayName("到期删除每次只提交一批一百条")
    void deleteExpiredAccountsUsesFixedBatchLimit() {
        OffsetDateTime now = OffsetDateTime.parse("2026-08-09T18:00:00+08:00");
        when(blogUserMapper.deleteExpiredPendingUsers(now, 100)).thenReturn(3);

        assertThat(deletionService.deleteExpiredAccounts(now)).isEqualTo(3);

        verify(blogUserMapper).deleteExpiredPendingUsers(now, 100);
    }

    @Test
    @DisplayName("到期删除公开方法配置受检异常回滚")
    void deleteExpiredAccountsIsTransactional() throws Exception {
        Method method = BlogUserDeletionServiceImpl.class
                .getMethod("deleteExpiredAccounts", OffsetDateTime.class);

        Transactional transactional = method.getAnnotation(Transactional.class);
        assertThat(transactional).isNotNull();
        assertThat(transactional.rollbackFor()).contains(Exception.class);
    }
}
