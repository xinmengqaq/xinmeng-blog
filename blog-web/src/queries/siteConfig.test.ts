import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getPublicSiteBackground } from '@/api/siteConfig'
import { removeSiteBackground, uploadSiteBackground } from '@/api/file'
import type { ImageDraft } from '@/types/file'

import { publicContentQueryKeys } from './publicContent'
import {
  siteConfigQueryKeys,
  usePublicSiteBackgroundQuery,
  useSaveSiteBackgroundMutation,
} from './siteConfig'

vi.mock('@/api/siteConfig', () => ({
  getPublicSiteBackground: vi.fn(),
}))

vi.mock('@/api/file', () => ({
  removeSiteBackground: vi.fn(),
  uploadSiteBackground: vi.fn(),
}))

const createDraft = (): ImageDraft => ({
  id: 'background-draft',
  originalFile: new File(['source'], 'background.webp', {
    type: 'image/webp',
  }),
  previewUrl: 'blob:background-draft',
  type: 'static',
  uploadBlob: new Blob(['cropped'], { type: 'image/webp' }),
})

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

describe('公开站点背景 Query', () => {
  afterEach(() => vi.clearAllMocks())

  it('背景 Query 使用独立缓存键并消费可空背景结果', async () => {
    // Given 后端已返回当前背景地址或空背景
    // When 前台创建公开站点背景 Query
    // Then Query 使用独立缓存键，并把 string 或 null 提供给调用方
    vi.mocked(getPublicSiteBackground).mockResolvedValue({
      backgroundUrl: '/files/site/background.webp',
    })
    const { queryClient, Wrapper } = createWrapper()

    const { result } = renderHook(() => usePublicSiteBackgroundQuery(), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(siteConfigQueryKeys.background()).toEqual([
      'site-config',
      'background',
    ])
    expect(siteConfigQueryKeys.background()).not.toEqual(
      publicContentQueryKeys.home(),
    )
    expect(queryClient.getQueryData(siteConfigQueryKeys.background())).toEqual({
      backgroundUrl: '/files/site/background.webp',
    })
  })

  it('前台路由切换重新挂载时复用本次会话的背景缓存', async () => {
    // Given 当前浏览器会话已经成功请求一次站点背景
    vi.mocked(getPublicSiteBackground).mockResolvedValue({
      backgroundUrl: '/files/site/background.webp',
    })
    const { Wrapper } = createWrapper()
    const first = renderHook(() => usePublicSiteBackgroundQuery(), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    first.unmount()

    // When 前台客户端路由跳转后背景组件重新挂载
    const second = renderHook(() => usePublicSiteBackgroundQuery(), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))

    // Then 直接复用内存缓存，不重复发送头图请求
    expect(second.result.current.data).toEqual({
      backgroundUrl: '/files/site/background.webp',
    })
    expect(getPublicSiteBackground).toHaveBeenCalledTimes(1)
  })

  it('背景 Query 失败不会丢弃已经成功的首页文章数据', async () => {
    // Given 首页文章查询已成功且背景请求发生错误
    // When TanStack Query 分别维护两条公开请求
    // Then 首页文章缓存保持可用，错误只属于背景 Query
    const home = { featuredArticles: [], latestArticles: [] }
    vi.mocked(getPublicSiteBackground).mockRejectedValue(new Error('背景失败'))
    const { queryClient, Wrapper } = createWrapper()
    queryClient.setQueryData(publicContentQueryKeys.home(), home)

    const { result } = renderHook(() => usePublicSiteBackgroundQuery(), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(queryClient.getQueryData(publicContentQueryKeys.home())).toEqual(
      home,
    )
    expect(
      queryClient.getQueryData(siteConfigQueryKeys.background()),
    ).toBeUndefined()
  })
})

describe('站点背景保存 Query', () => {
  afterEach(() => vi.clearAllMocks())

  it('上传成功后以 FastAPI 确认地址更新并刷新独立公开背景缓存', async () => {
    // Given 管理员暂存了裁剪后的站点背景，公开背景缓存仍是当前线上值
    // When 保存 mutation 调用 FastAPI 背景上传接口成功
    // Then 缓存先使用确认的 file_url，并失效独立公开背景 Query 以读取真实公开值
    const { queryClient, Wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const draft = createDraft()
    vi.mocked(uploadSiteBackground).mockResolvedValue({
      file_url: '/files/site/confirmed-background.webp',
    })
    const { result } = renderHook(() => useSaveSiteBackgroundMutation(), {
      wrapper: Wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({ kind: 'upload', draft })
    })

    expect(uploadSiteBackground).toHaveBeenCalledWith(draft)
    expect(queryClient.getQueryData(siteConfigQueryKeys.background())).toEqual({
      backgroundUrl: '/files/site/confirmed-background.webp',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: siteConfigQueryKeys.background(),
    })
  })

  it('移除成功后将独立公开背景缓存更新为空值', async () => {
    // Given 管理员已确认移除站点背景
    // When 保存 mutation 调用 FastAPI 背景移除接口成功
    // Then 公开背景缓存更新为 null 并触发独立背景读取刷新
    const { queryClient, Wrapper } = createWrapper()
    vi.mocked(removeSiteBackground).mockResolvedValue(undefined)
    const { result } = renderHook(() => useSaveSiteBackgroundMutation(), {
      wrapper: Wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({ kind: 'remove' })
    })

    expect(removeSiteBackground).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(siteConfigQueryKeys.background())).toEqual({
      backgroundUrl: null,
    })
  })

  it('保存失败时不改写公开缓存，保留页面草稿的重试机会', async () => {
    // Given 公开背景缓存已有当前线上值，管理员暂存了新的背景草稿
    // When FastAPI 背景上传返回中文错误
    // Then mutation 向页面传播错误且不改写公开缓存，由页面保留草稿重试
    const { queryClient, Wrapper } = createWrapper()
    const error = { code: 'BACKGROUND_SAVE_FAILED', message: '背景保存失败' }
    queryClient.setQueryData(siteConfigQueryKeys.background(), {
      backgroundUrl: '/files/site/current-background.webp',
    })
    vi.mocked(uploadSiteBackground).mockRejectedValue(error)
    const { result } = renderHook(() => useSaveSiteBackgroundMutation(), {
      wrapper: Wrapper,
    })

    await expect(
      result.current.mutateAsync({ kind: 'upload', draft: createDraft() }),
    ).rejects.toEqual(error)

    expect(queryClient.getQueryData(siteConfigQueryKeys.background())).toEqual({
      backgroundUrl: '/files/site/current-background.webp',
    })
  })

  it('移除失败后允许再次调用幂等的 FastAPI 删除接口', async () => {
    // Given 管理员保留了失败的背景移除标记
    // When 第一次删除失败后再次保存且 FastAPI 以幂等结果成功
    // Then 前端再次调用同一个删除接口，并最终把公开缓存更新为空值
    const { queryClient, Wrapper } = createWrapper()
    vi.mocked(removeSiteBackground)
      .mockRejectedValueOnce({
        code: 'BACKGROUND_REMOVE_FAILED',
        message: '背景移除失败',
      })
      .mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useSaveSiteBackgroundMutation(), {
      wrapper: Wrapper,
    })

    await expect(
      result.current.mutateAsync({ kind: 'remove' }),
    ).rejects.toEqual({
      code: 'BACKGROUND_REMOVE_FAILED',
      message: '背景移除失败',
    })
    await act(async () => {
      await result.current.mutateAsync({ kind: 'remove' })
    })

    expect(removeSiteBackground).toHaveBeenCalledTimes(2)
    expect(queryClient.getQueryData(siteConfigQueryKeys.background())).toEqual({
      backgroundUrl: null,
    })
  })
})
