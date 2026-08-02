import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createArticle,
  batchDeleteArticles,
  deleteArticle,
  getArticlePage,
  updateArticle,
  updateArticleRecommend,
  updateArticleStatus,
  updateArticleTop,
} from '@/api/article'
import type { ArticleSaveParams, ArticleVO } from '@/types/article'

import {
  articleQueryKeys,
  useArticlePageQuery,
  useBatchDeleteArticlesMutation,
  useCreateArticleMutation,
  useDeleteArticleMutation,
  useUpdateArticleMutation,
  useUpdateArticleRecommendMutation,
  useUpdateArticleStatusMutation,
  useUpdateArticleTopMutation,
} from './article'

vi.mock('@/api/article', () => ({
  createArticle: vi.fn(),
  batchDeleteArticles: vi.fn(),
  deleteArticle: vi.fn(),
  getArticleDetail: vi.fn(),
  getArticlePage: vi.fn(),
  updateArticle: vi.fn(),
  updateArticleRecommend: vi.fn(),
  updateArticleStatus: vi.fn(),
  updateArticleTop: vi.fn(),
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

const articleVO = (overrides: Partial<ArticleVO> = {}): ArticleVO => ({
  id: 1,
  title: '文章标题',
  summary: '文章摘要',
  content: '# 正文',
  coverUrl: '/covers/1.png',
  status: 'draft',
  viewCount: 0,
  commentCount: 0,
  createdAt: '2026-07-09T12:00:00+08:00',
  updatedAt: '2026-07-09T12:00:00+08:00',
  ...overrides,
})

const saveParams = (
  overrides: Partial<ArticleSaveParams> = {},
): ArticleSaveParams => ({
  title: '文章标题',
  summary: '文章摘要',
  content: '# 正文',
  coverUrl: '/covers/1.png',
  status: 'draft',
  ...overrides,
})

describe('文章 Query', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('分页查询缓存键应包含分页和全部组合筛选条件', async () => {
    // Given 管理员在文章列表页输入筛选条件并切换页码
    vi.mocked(getArticlePage).mockResolvedValue({
      page: 3,
      size: 10,
      total: 1,
      pages: 1,
      list: [articleVO()],
    })
    const params = {
      page: 3,
      size: 10,
      keyword: 'React',
      status: 'published' as const,
    }
    const { queryClient, Wrapper } = createWrapper()

    // When 页面创建文章分页查询
    const { result } = renderHook(() => useArticlePageQuery(params), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Then 查询缓存键应包含 page、size、keyword、status，避免不同筛选结果互相复用
    expect(getArticlePage).toHaveBeenCalledWith(params)
    expect(
      queryClient.getQueryData(articleQueryKeys.page(params)),
    ).toMatchObject({ page: 3, size: 10 })
    expect(articleQueryKeys.page(params)).toContainEqual({
      page: 3,
      size: 10,
      keyword: 'React',
      status: 'published',
      categoryId: null,
      tagId: null,
    })
  })

  it('新增文章成功后应失效文章列表缓存', async () => {
    // Given 管理员在新建文章页保存文章成功
    vi.mocked(createArticle).mockResolvedValue({ id: 10 })
    const { queryClient, Wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    // When 新增文章变更完成
    const { result } = renderHook(() => useCreateArticleMutation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync(saveParams())

    // Then 文章列表缓存应失效，返回列表时能看到新文章
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: articleQueryKeys.pages(),
    })
  })

  it('修改文章成功后应失效文章列表和当前详情缓存', async () => {
    // Given 管理员在编辑文章页修改文章成功
    const updated = articleVO({ id: 6, title: '修改后的标题' })
    vi.mocked(updateArticle).mockResolvedValue(updated)
    const { queryClient, Wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    // When 修改文章变更完成
    const { result } = renderHook(() => useUpdateArticleMutation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      id: 6,
      params: saveParams({ title: '修改后的标题' }),
    })

    // Then 文章列表缓存和当前文章详情缓存应失效，列表摘要和编辑页详情都能刷新
    expect(updateArticle).toHaveBeenCalledWith(6, {
      title: '修改后的标题',
      summary: '文章摘要',
      content: '# 正文',
      coverUrl: '/covers/1.png',
      status: 'draft',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: articleQueryKeys.pages(),
    })
    expect(queryClient.getQueryData(articleQueryKeys.detail(6))).toEqual(
      updated,
    )
  })

  it('删除文章成功后应失效文章列表缓存', async () => {
    // Given 管理员确认删除文章并收到后端成功响应
    vi.mocked(deleteArticle).mockResolvedValue(undefined)
    const { queryClient, Wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    // When 删除文章变更完成
    const { result } = renderHook(() => useDeleteArticleMutation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync(7)

    // Then 文章列表缓存应失效，列表不再展示已删除文章
    expect(deleteArticle).toHaveBeenCalledWith(7)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: articleQueryKeys.pages(),
    })
  })

  it('编辑页保存成功后应更新当前详情缓存', async () => {
    // Given 管理员在已有文章编辑页保存修改
    const updated = articleVO({ id: 3, title: '缓存内的新标题' })
    vi.mocked(updateArticle).mockResolvedValue(updated)
    const { queryClient, Wrapper } = createWrapper()

    // When 后端返回修改后的文章详情
    const { result } = renderHook(() => useUpdateArticleMutation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      id: 3,
      params: saveParams({ title: '缓存内的新标题' }),
    })

    // Then 当前文章详情缓存应更新为后端返回内容
    expect(queryClient.getQueryData(articleQueryKeys.detail(3))).toEqual(
      updated,
    )
  })

  it('文章快捷操作成功后应失效文章分页缓存', async () => {
    // Given 管理员成功修改文章状态、置顶或推荐设置
    vi.mocked(updateArticleStatus).mockResolvedValue(undefined)
    vi.mocked(updateArticleTop).mockResolvedValue(undefined)
    vi.mocked(updateArticleRecommend).mockResolvedValue(undefined)
    const { queryClient, Wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    // When 对应文章变更完成
    const status = renderHook(() => useUpdateArticleStatusMutation(), {
      wrapper: Wrapper,
    })
    const top = renderHook(() => useUpdateArticleTopMutation(), {
      wrapper: Wrapper,
    })
    const recommend = renderHook(() => useUpdateArticleRecommendMutation(), {
      wrapper: Wrapper,
    })
    await status.result.current.mutateAsync({ id: 8, status: 'published' })
    await top.result.current.mutateAsync({ id: 8, isTop: true })
    await recommend.result.current.mutateAsync({ id: 8, isRecommend: true })
    // Then 所有文章分页查询应失效并从后端刷新
    expect(invalidateQueries).toHaveBeenCalledTimes(3)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: articleQueryKeys.pages(),
    })
  })

  it('批量删除成功后应失效文章分页缓存', async () => {
    // Given 管理员成功批量删除当前页选中的文章
    vi.mocked(batchDeleteArticles).mockResolvedValue({ deletedCount: 2 })
    const { queryClient, Wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    // When 批量删除变更完成
    const { result } = renderHook(() => useBatchDeleteArticlesMutation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync([2, 5])
    // Then 所有文章分页查询应失效并从后端刷新
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: articleQueryKeys.pages(),
    })
  })
})
