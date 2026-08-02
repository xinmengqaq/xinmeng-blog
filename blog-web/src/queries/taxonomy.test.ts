import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createCategory, updateTag } from '@/api/taxonomy'

import {
  taxonomyQueryKeys,
  useCreateCategoryMutation,
  useUpdateTagMutation,
} from './taxonomy'

vi.mock('@/api/taxonomy', () => ({
  createCategory: vi.fn(),
  createTag: vi.fn(),
  deleteCategory: vi.fn(),
  deleteTag: vi.fn(),
  getCategories: vi.fn(),
  getTags: vi.fn(),
  updateCategory: vi.fn(),
  updateTag: vi.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, Wrapper }
}

describe('分类标签 Query', () => {
  afterEach(() => vi.clearAllMocks())

  it('分类写操作成功后应失效分类标签缓存', async () => {
    // Given 管理员成功创建、修改或删除分类
    vi.mocked(createCategory).mockResolvedValue({ id: 4 })
    const { queryClient, Wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    // When 分类变更完成
    const { result } = renderHook(() => useCreateCategoryMutation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      name: '前端',
      description: null,
      sortOrder: 0,
      status: 'visible',
    })
    // Then 分类标签查询缓存应失效并从后端刷新
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: taxonomyQueryKeys.all,
    })
  })

  it('标签写操作成功后应失效分类标签缓存', async () => {
    // Given 管理员成功创建、修改或删除标签
    vi.mocked(updateTag).mockResolvedValue({
      id: 3,
      name: 'MyBatis',
      articleCount: 0,
      createdAt: '2026-07-11T12:00:00+08:00',
      updatedAt: '2026-07-11T12:00:00+08:00',
    })
    const { queryClient, Wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    // When 标签变更完成
    const { result } = renderHook(() => useUpdateTagMutation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({ id: 3, params: { name: 'MyBatis' } })
    // Then 分类标签查询缓存应失效并从后端刷新
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: taxonomyQueryKeys.all,
    })
  })
})
