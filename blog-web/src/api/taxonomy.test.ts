import { afterEach, describe, expect, it, vi } from 'vitest'

import { request } from '@/utils/request'

import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  getCategories,
  getTags,
  updateCategory,
  updateTag,
} from './taxonomy'

vi.mock('@/utils/request', () => ({
  request: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

describe('文章分类 API', () => {
  afterEach(() => vi.clearAllMocks())

  it('查询分类时应只传递后端支持的状态参数', () => {
    // Given 管理员选择分类显示状态
    // When 前端请求文章分类列表
    getCategories('visible')
    // Then 请求只应包含后端支持的 status 参数
    expect(request.get).toHaveBeenCalledWith('/admin/categories', {
      params: { status: 'visible' },
    })
  })

  it('创建分类时应提交完整分类字段', () => {
    // Given 管理员填写分类名称、描述、排序值和状态
    const params = {
      name: '前端',
      description: '前端文章',
      sortOrder: 1,
      status: 'visible' as const,
    }
    // When 前端提交新建分类请求
    createCategory(params)
    // Then 请求应包含后端支持的完整分类保存参数
    expect(request.post).toHaveBeenCalledWith('/admin/categories', params)
  })

  it('修改分类时应向指定分类提交完整字段', () => {
    // Given 管理员修改已有分类信息
    const params = {
      name: '后端',
      description: null,
      sortOrder: 2,
      status: 'hidden' as const,
    }
    // When 前端提交分类修改请求
    updateCategory(8, params)
    // Then 请求应携带分类 ID 和完整分类保存参数
    expect(request.put).toHaveBeenCalledWith('/admin/categories/8', params)
  })

  it('删除分类时应请求指定分类资源', () => {
    // Given 管理员确认删除未被文章占用的分类
    // When 前端提交分类删除请求
    deleteCategory(8)
    // Then 请求应删除指定分类 ID 对应的资源
    expect(request.delete).toHaveBeenCalledWith('/admin/categories/8')
  })
})

describe('文章标签 API', () => {
  afterEach(() => vi.clearAllMocks())

  it('查询标签时应传递名称关键词', () => {
    // Given 管理员输入标签名称关键词
    // When 前端请求文章标签列表
    getTags('React')
    // Then 请求应只传递后端支持的 keyword 参数
    expect(request.get).toHaveBeenCalledWith('/admin/tags', {
      params: { keyword: 'React' },
    })
  })

  it('创建标签时应提交标签名称', () => {
    // Given 管理员填写新的标签名称
    // When 前端提交新建标签请求
    createTag({ name: 'TypeScript' })
    // Then 请求应包含后端支持的标签名称
    expect(request.post).toHaveBeenCalledWith('/admin/tags', {
      name: 'TypeScript',
    })
  })

  it('修改标签时应向指定标签提交名称', () => {
    // Given 管理员修改已有标签名称
    // When 前端提交标签修改请求
    updateTag(3, { name: 'MyBatis' })
    // Then 请求应携带标签 ID 和新的标签名称
    expect(request.put).toHaveBeenCalledWith('/admin/tags/3', {
      name: 'MyBatis',
    })
  })

  it('删除标签时应请求指定标签资源', () => {
    // Given 管理员确认删除未被文章占用的标签
    // When 前端提交标签删除请求
    deleteTag(3)
    // Then 请求应删除指定标签 ID 对应的资源
    expect(request.delete).toHaveBeenCalledWith('/admin/tags/3')
  })
})
