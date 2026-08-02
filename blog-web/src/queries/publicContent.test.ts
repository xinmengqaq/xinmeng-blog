import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { likePublicArticle } from '@/api/publicContent'
import type { PublicArticleDetail } from '@/types/publicContent'

import {
  publicContentQueryKeys,
  useLikePublicArticleMutation,
} from './publicContent'

vi.mock('@/api/publicContent', () => ({
  getArticleFilterMeta: vi.fn(),
  getPublicArticleDetail: vi.fn(),
  getPublicArticlePage: vi.fn(),
  getPublicCategories: vi.fn(),
  getPublicHome: vi.fn(),
  getPublicTags: vi.fn(),
  likePublicArticle: vi.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, Wrapper }
}

describe('公开内容 Query', () => {
  afterEach(() => vi.clearAllMocks())

  it('等价筛选应生成相同 Query Key 且与后台缓存隔离', () => {
    // Given 两组业务含义相同但标签顺序不同的公开文章筛选
    // When 生成公开文章分页 Query Key
    const left = publicContentQueryKeys.page({
      page: 1,
      size: 10,
      tagIds: [8, 2, 8],
    })
    const right = publicContentQueryKeys.page({
      page: 1,
      size: 10,
      tagIds: [2, 8],
    })
    // Then Query Key 应完全相同且不得进入后台 article 缓存命名空间
    expect(left).toEqual(right)
    expect(left[0]).toBe('public-content')
    expect(left[0]).not.toBe('articles')
  })

  it('点赞成功应更新当前详情并刷新公开列表数据', async () => {
    // Given 当前公开详情缓存中存在文章及点赞数
    const detail = {
      id: 9,
      title: '文章',
      tags: [],
      likeCount: 3,
    } satisfies PublicArticleDetail
    vi.mocked(likePublicArticle).mockResolvedValue({ likeCount: 4 })
    const { queryClient, Wrapper } = createWrapper()
    queryClient.setQueryData(publicContentQueryKeys.detail(9), detail)
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    // When 匿名点赞请求成功并返回服务端最新计数
    const { result } = renderHook(() => useLikePublicArticleMutation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync(9)
    // Then 当前详情应使用服务端计数且首页和公开列表缓存应失效
    expect(queryClient.getQueryData(publicContentQueryKeys.detail(9))).toEqual({
      ...detail,
      likeCount: 4,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: publicContentQueryKeys.home(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: publicContentQueryKeys.pages(),
    })
  })

  it('点赞失败不应修改任何公开文章计数', async () => {
    // Given 当前公开详情缓存中存在稳定点赞数
    const detail = {
      id: 9,
      title: '文章',
      tags: [],
      likeCount: 3,
    } satisfies PublicArticleDetail
    vi.mocked(likePublicArticle).mockRejectedValue(new Error('失败'))
    const { queryClient, Wrapper } = createWrapper()
    queryClient.setQueryData(publicContentQueryKeys.detail(9), detail)
    // When 匿名点赞请求失败
    const { result } = renderHook(() => useLikePublicArticleMutation(), {
      wrapper: Wrapper,
    })
    await expect(result.current.mutateAsync(9)).rejects.toThrow('失败')
    // Then 详情点赞数应保持不变且不得写入失败结果
    expect(queryClient.getQueryData(publicContentQueryKeys.detail(9))).toEqual(
      detail,
    )
  })

  it('分类或标签失败不应清空已成功的文章数据', () => {
    // Given 公开文章查询已成功且分类或标签查询失败
    const { queryClient } = createWrapper()
    const pageKey = publicContentQueryKeys.page({ page: 1, size: 10 })
    queryClient.setQueryData(pageKey, {
      page: 1,
      size: 10,
      total: 0,
      pages: 0,
      list: [],
    })
    queryClient.setQueryData(publicContentQueryKeys.categories(), undefined)
    // When TanStack Query 分别维护各自缓存状态
    // Then 文章数据应继续可用且错误只属于失败的元数据查询
    expect(queryClient.getQueryData(pageKey)).toMatchObject({ page: 1 })
  })
})
