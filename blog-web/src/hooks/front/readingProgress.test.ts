import { describe, expect, it } from 'vitest'

import { calculateReadingProgress } from './readingProgress'

describe('阅读进度计算', () => {
  it('只有页面真正滚动到底才显示百分之百', () => {
    // Given 文章从页面中段开始且整页仍有可滚动距离
    // When 访客位于文章之前、阅读中、接近底部或真正到达底部
    // Then 进度从零增长且在到达页面底部前不会提前显示百分之百
    expect(calculateReadingProgress(100, 1100, 600, 0)).toBe(0)
    expect(calculateReadingProgress(100, 1100, 600, 300)).toBe(50)
    expect(calculateReadingProgress(100, 1100, 600, 499)).toBe(99)
    expect(calculateReadingProgress(100, 1100, 600, 500)).toBe(100)
    expect(calculateReadingProgress(100, 1100, 600, 2000)).toBe(100)
  })

  it('整页不足一屏时应视为已经到达页面底部', () => {
    // Given 文章所在页面没有可滚动距离
    // When 访客打开这篇短文
    // Then 阅读进度应稳定为完成状态且不产生除零或无效数值
    expect(calculateReadingProgress(100, 500, 600, 0)).toBe(100)
  })
})
