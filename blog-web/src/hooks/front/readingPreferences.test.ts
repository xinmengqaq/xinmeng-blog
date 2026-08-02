import { afterEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_READING_PREFERENCES,
  normalizeReadingPreferences,
  READING_PREFERENCES_KEY,
  readReadingPreferences,
} from './readingPreferences'

describe('阅读偏好', () => {
  afterEach(() => localStorage.clear())
  it('有效阅读偏好应从当前设备恢复', () => {
    // Given 当前设备保存了合法字号、行高和正文宽度
    // When 打开公开文章详情
    // Then 阅读偏好应恢复并映射为正文 CSS 变量
    localStorage.setItem(
      READING_PREFERENCES_KEY,
      JSON.stringify({ fontSize: 19, lineHeight: 2, contentWidth: 760 }),
    )
    expect(readReadingPreferences()).toEqual({
      fontSize: 19,
      lineHeight: 2,
      contentWidth: 760,
    })
  })

  it('损坏或越界偏好应回退默认值', () => {
    // Given 本地存储包含损坏 JSON 或超出允许范围的阅读偏好
    // When 前端读取阅读偏好
    // Then 应只回退本模块默认值且不影响其他本地数据
    localStorage.setItem('other', 'keep')
    expect(
      normalizeReadingPreferences({
        fontSize: 99,
        lineHeight: 1,
        contentWidth: 10,
      }),
    ).toEqual(DEFAULT_READING_PREFERENCES)
    expect(localStorage.getItem('other')).toBe('keep')
  })
})
