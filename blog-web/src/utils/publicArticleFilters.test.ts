import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PUBLIC_ARTICLE_FILTERS,
  normalizePublicArticleFilters,
  parsePublicArticleFilters,
  serializePublicArticleFilters,
  updatePublicArticleFilters,
} from './publicArticleFilters'

describe('公开文章筛选规范化', () => {
  it('等价筛选输入应得到相同的规范化结果', () => {
    // Given 标签顺序、重复项和关键词空白不同但业务含义相同的筛选输入
    // When 前端规范化公开文章筛选条件
    const left = normalizePublicArticleFilters({
      page: 2,
      size: 10,
      keyword: ' React ',
      tagIds: [8, 2, 8],
      year: 2026,
      month: 7,
    })
    const right = normalizePublicArticleFilters({
      page: 2,
      size: 10,
      keyword: 'React',
      tagIds: [2, 8],
      year: 2026,
      month: 7,
    })
    // Then 结果应具有相同关键词、去重升序标签和有效年月条件
    expect(left).toEqual(right)
    expect(left.tagIds).toEqual([2, 8])
  })

  it('非法筛选值应回退为公开列表默认条件', () => {
    // Given URL 或页面状态中包含非法页码、分类、标签、年份或月份
    // When 前端规范化公开文章筛选条件
    const result = normalizePublicArticleFilters({
      page: -2,
      size: 0,
      categoryId: -1,
      tagIds: [0, -3],
      year: 1900,
      month: 20,
    })
    // Then 非法条件应被丢弃且分页应回退到稳定默认值
    expect(result).toEqual(DEFAULT_PUBLIC_ARTICLE_FILTERS)
  })

  it('筛选条件应从 URL 恢复并以规范顺序写回 URL', () => {
    // Given URL 包含关键词、分类、年月、重复标签和页码
    // When 前端解析并重新序列化公开文章筛选
    const filters = parsePublicArticleFilters(
      new URLSearchParams(
        'keyword=%20React%20&categoryId=3&year=2026&month=7&tagIds=8,2,8&page=4',
      ),
    )
    // Then 刷新、前进后退和复制链接应恢复同一规范筛选状态
    expect(serializePublicArticleFilters(filters).toString()).toBe(
      'page=4&keyword=React&categoryId=3&tagIds=2%2C8&year=2026&month=7',
    )
  })

  it('任一非分页筛选变化应把页码重置为第一页', () => {
    // Given 访客正在公开文章列表的后续页
    // When 修改关键词、分类、年月或标签筛选
    const next = updatePublicArticleFilters(
      normalizePublicArticleFilters({ page: 5, size: 10, tagIds: [2] }),
      { keyword: 'TypeScript' },
    )
    // Then URL 应保留其他有效条件并把 page 重置为 1
    expect(next).toMatchObject({ page: 1, keyword: 'TypeScript', tagIds: [2] })
  })
})
