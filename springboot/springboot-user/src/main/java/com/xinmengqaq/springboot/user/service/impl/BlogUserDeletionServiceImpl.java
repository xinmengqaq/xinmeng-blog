package com.xinmengqaq.springboot.user.service.impl;

import com.xinmengqaq.springboot.user.mapper.BlogUserMapper;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * 待删除用户的有限批次清理实现。
 */
@Service
public class BlogUserDeletionServiceImpl {

    private static final int DELETE_BATCH_SIZE = 100;

    @Resource
    private BlogUserMapper blogUserMapper;

    /**
     * 在单个事务中删除一批到期账号，失败时整批回滚并留待下次重试。
     *
     * @param now 当前时间
     * @return 实际删除数量
     */
    @Transactional(rollbackFor = Exception.class)
    public int deleteExpiredAccounts(OffsetDateTime now) {
        return blogUserMapper.deleteExpiredPendingUsers(now, DELETE_BATCH_SIZE);
    }
}
