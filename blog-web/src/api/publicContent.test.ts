import { afterEach, describe, expect, it, vi } from 'vitest'

import { request } from '@/utils/request'

import {
  getArticleFilterMeta,
  getPublicArticleDetail,
  getPublicArticlePage,
  getPublicCategories,
  getPublicHome,
  getPublicTags,
  likePublicArticle,
} from './publicContent'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('公开内容 API', () => {
  afterEach(() => vi.clearAllMocks())

  it('首页请求只访问公开首页接口', () => {
    // Given 前台需要加载首页精选文章和最新文章
    // When 发起首页数据请求
    getPublicHome()
    // Then 请求应访问 GET /home 且不得包含 /admin/
    expect(request.get).toHaveBeenCalledWith('/home')
  })

  it('文章分页请求按公开契约序列化筛选参数', () => {
    // Given 前台提供页码、关键词、分类、标签和年月筛选
    // When 发起公开文章分页请求
    getPublicArticlePage({
      page: 2,
      size: 10,
      keyword: ' React ',
      categoryId: 3,
      tagIds: [8, 2, 8],
      year: 2026,
      month: 7,
    })
    // Then 请求应访问 GET /articles，并以逗号分隔标签且不发送无效年月参数
    expect(request.get).toHaveBeenCalledWith('/articles', {
      params: {
        page: 2,
        size: 10,
        keyword: 'React',
        categoryId: 3,
        tagIds: '2,8',
        year: 2026,
        month: 7,
      },
    })

    getPublicArticlePage({ page: 1, size: 10, tagIds: [], month: 5 })
    expect(request.get).toHaveBeenLastCalledWith('/articles', {
      params: { page: 1, size: 10 },
    })
  })

  it('文章详情和元数据请求使用公开路径', () => {
    // Given 访客打开公开文章详情或筛选面板
    // When 分别请求详情、分类、标签和归档元数据
    getPublicArticleDetail(12)
    getArticleFilterMeta()
    getPublicCategories()
    getPublicTags()
    // Then 所有请求都应访问公开接口且不得复用任何 /admin/ 路径
    expect(vi.mocked(request.get).mock.calls).toEqual([
      ['/articles/12'],
      ['/articles/meta'],
      ['/categories'],
      ['/tags'],
    ])
  })

  it('点赞请求使用公开路径且不发送伪造访客数据', () => {
    // Given 访客对公开文章执行匿名点赞
    // When 发起点赞请求
    likePublicArticle(9)
    // Then 请求应由后端 Cookie 识别访客且前端请求体保持为空
    expect(request.post).toHaveBeenCalledWith('/articles/9/like')
  })
})
