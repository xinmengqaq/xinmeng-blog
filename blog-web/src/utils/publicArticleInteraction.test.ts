import { describe, expect, it } from 'vitest'

import {
  getLikeErrorMessage,
  getScrollBehavior,
} from './publicArticleInteraction'

describe('公开文章交互逻辑', () => {
  it('点赞错误应区分重复、限频和普通失败', () => {
    // Given 后端分别返回 409、带等待秒数的 429 或普通错误
    // When 前台解释匿名点赞失败结果
    // Then 应生成对应业务提示且不得改变原点赞计数
    expect(getLikeErrorMessage({ code: '409', message: '重复' })).toContain(
      '已经',
    )
    expect(
      getLikeErrorMessage({
        code: '429',
        message: '限频',
        details: { retryAfterSeconds: 12 },
      }),
    ).toContain('12')
    expect(getLikeErrorMessage({ code: '500', message: '失败' })).toBe('失败')
  })

  it('返回顶部策略应尊重减少动态效果偏好', () => {
    // Given 访客选择减少动态效果或允许平滑动画
    // When 执行返回文章顶部操作
    // Then 滚动策略应分别使用立即滚动或平滑滚动
    expect(getScrollBehavior(true)).toBe('auto')
    expect(getScrollBehavior(false)).toBe('smooth')
  })
})
