import { afterEach, describe, expect, it, vi } from 'vitest'

import { request } from '@/utils/request'

import {
  createArticle,
  batchDeleteArticles,
  deleteArticle,
  getArticleDetail,
  getArticlePage,
  updateArticle,
  updateArticleRecommend,
  updateArticleStatus,
  updateArticleTop,
} from './article'

vi.mock('@/utils/request', () => ({
  request: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}))

describe('文章 API', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('分页查询文章时应使用 GET /admin/articles 并传递页码每页数量关键词和状态', () => {
    // Given 管理员位于文章列表页，并设置页码、每页数量、关键词和文章状态
    const params = {
      page: 2,
      size: 10,
      keyword: 'React',
      status: 'published' as const,
    }

    // When 页面请求文章分页数据
    getArticlePage(params)

    // Then 前端应调用 GET /admin/articles，并只传递后端支持的查询参数
    expect(request.get).toHaveBeenCalledWith('/admin/articles', {
      params,
    })
  })

  it('查询文章详情时应使用 GET /admin/articles/:id', () => {
    // Given 管理员进入已有文章编辑页
    const articleId = 12

    // When 页面读取指定文章详情
    getArticleDetail(articleId)

    // Then 前端应调用 GET /admin/articles/:id，并返回文章标题、摘要、正文、封面和状态
    expect(request.get).toHaveBeenCalledWith('/admin/articles/12')
  })

  it('新增文章时应使用 POST /admin/articles 并返回新文章 ID', () => {
    // Given 管理员在新建文章页填写标题、正文、摘要、封面和状态
    const params = {
      title: '新文章',
      summary: '摘要',
      content: '# 正文',
      coverUrl: '/covers/1.png',
      status: 'draft' as const,
    }

    // When 管理员点击保存文章
    createArticle(params)

    // Then 前端应调用 POST /admin/articles，并从响应中读取新文章 ID
    expect(request.post).toHaveBeenCalledWith('/admin/articles', params)
  })

  it('修改文章时应使用 PUT /admin/articles/:id 并返回修改后的文章', () => {
    // Given 管理员在编辑文章页修改文章内容
    const params = {
      title: '修改文章',
      content: '正文',
      status: 'published' as const,
    }

    // When 管理员点击保存文章
    updateArticle(8, params)

    // Then 前端应调用 PUT /admin/articles/:id，并用响应刷新当前文章详情
    expect(request.put).toHaveBeenCalledWith('/admin/articles/8', params)
  })

  it('删除文章时应使用 DELETE /admin/articles/:id', () => {
    // Given 管理员确认删除某篇文章
    const articleId = 9

    // When 前端提交删除请求
    deleteArticle(articleId)

    // Then 前端应调用 DELETE /admin/articles/:id，并在成功后刷新列表或返回列表页
    expect(request.delete).toHaveBeenCalledWith('/admin/articles/9')
  })

  it('组合筛选文章时应传递分类和标签参数', () => {
    // Given 管理员选择文章状态、分类和标签组合条件
    // When 前端请求文章分页列表
    getArticlePage({
      page: 1,
      size: 10,
      status: 'published',
      categoryId: 4,
      tagId: 6,
    })
    // Then 请求应传递后端支持的 categoryId 和 tagId 筛选参数
    expect(request.get).toHaveBeenCalledWith('/admin/articles', {
      params: {
        page: 1,
        size: 10,
        status: 'published',
        categoryId: 4,
        tagId: 6,
      },
    })
  })

  it('更新文章状态时应提交目标状态', () => {
    // Given 管理员在文章列表选择新的文章状态
    // When 前端提交状态变更
    updateArticleStatus(8, 'published')
    // Then 请求应调用文章状态接口并提交目标 status
    expect(request.patch).toHaveBeenCalledWith('/admin/articles/8/status', {
      status: 'published',
    })
  })

  it('更新文章置顶时应提交目标置顶值', () => {
    // Given 管理员切换文章置顶设置
    // When 前端提交置顶变更
    updateArticleTop(8, true)
    // Then 请求应调用文章置顶接口并提交 isTop
    expect(request.patch).toHaveBeenCalledWith('/admin/articles/8/top', {
      isTop: true,
    })
  })

  it('更新文章推荐时应提交目标推荐值', () => {
    // Given 管理员切换文章推荐设置
    // When 前端提交推荐变更
    updateArticleRecommend(8, true)
    // Then 请求应调用文章推荐接口并提交 isRecommend
    expect(request.patch).toHaveBeenCalledWith('/admin/articles/8/recommend', {
      isRecommend: true,
    })
  })

  it('批量删除文章时应提交当前页选中的文章 ID', () => {
    // Given 管理员在当前页选中多篇文章并确认删除
    // When 前端提交批量删除请求
    batchDeleteArticles([2, 5])
    // Then 请求应只包含选中的文章 ids
    expect(request.post).toHaveBeenCalledWith('/admin/articles/batch-delete', {
      ids: [2, 5],
    })
  })
})
