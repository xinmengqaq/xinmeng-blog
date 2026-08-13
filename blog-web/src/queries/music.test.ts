import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createAdminMusic,
  deleteAdminMusic,
  getAdminMusicPage,
  updateAdminMusic,
} from '@/api/music'

import {
  musicQueryKeys,
  useCreateAdminMusicMutation,
  useDeleteAdminMusicMutation,
  useAdminMusicPageQuery,
  useUpdateAdminMusicMutation,
} from './music'

vi.mock('@/api/music', () => ({
  createAdminMusic: vi.fn(),
  deleteAdminMusic: vi.fn(),
  getAdminMusic: vi.fn(),
  getAdminMusicPage: vi.fn(),
  updateAdminMusic: vi.fn(),
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

const music = {
  id: 7,
  title: '夜曲',
  artist: '周杰伦',
  audio_url: '/files/music/audio/song.mp3',
  duration_ms: 240000,
  is_enabled: true,
  created_at: '2026-08-13T10:00:00+08:00',
  updated_at: '2026-08-13T10:00:00+08:00',
}

describe('后台音乐 Query', () => {
  afterEach(() => vi.clearAllMocks())

  it('分页查询使用稳定且包含页码的缓存键', async () => {
    // Given 后台音乐列表处于第 2 页
    vi.mocked(getAdminMusicPage).mockResolvedValue({
      items: [],
      page: 2,
      page_size: 20,
      total: 0,
      total_pages: 0,
    })
    const { Wrapper } = createWrapper()
    // When 页面读取音乐分页
    const { result } = renderHook(
      () => useAdminMusicPageQuery({ page: 2, page_size: 20 }),
      { wrapper: Wrapper },
    )
    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Then Query 应按相同分页参数请求并隔离缓存
    expect(getAdminMusicPage).toHaveBeenCalledWith({ page: 2, page_size: 20 })
    expect(musicQueryKeys.adminPage({ page: 2, page_size: 20 })).toEqual([
      'music',
      'admin',
      'page',
      { page: 2, page_size: 20 },
    ])
  })

  it.each([
    [
      '新增',
      useCreateAdminMusicMutation,
      createAdminMusic,
      { title: '夜曲', file: new File(['audio'], 'song.mp3') },
    ],
    ['删除', useDeleteAdminMusicMutation, deleteAdminMusic, 7],
  ] as const)(
    '%s成功后应失效后台音乐列表缓存',
    async (_name, useMutationHook, api, variables) => {
      // Given 管理员成功完成后台音乐写操作
      vi.mocked(api).mockResolvedValue(music as never)
      const { queryClient, Wrapper } = createWrapper()
      const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
      // When mutation 完成
      const { result } = renderHook(() => useMutationHook(), {
        wrapper: Wrapper,
      })
      await result.current.mutateAsync(variables as never)
      // Then 所有后台音乐分页缓存应失效
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: musicQueryKeys.adminPages(),
      })
    },
  )

  it('修改成功后应刷新列表并写入详情缓存', async () => {
    // Given 管理员成功修改音乐状态
    const updated = { ...music, is_enabled: false }
    vi.mocked(updateAdminMusic).mockResolvedValue(updated)
    const { queryClient, Wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    // When 修改 mutation 完成
    const { result } = renderHook(() => useUpdateAdminMusicMutation(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({ id: 7, data: { is_enabled: false } })
    // Then 列表应刷新且详情缓存立即反映服务端结果
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: musicQueryKeys.adminPages(),
    })
    expect(queryClient.getQueryData(musicQueryKeys.adminDetail(7))).toEqual(
      updated,
    )
  })
})
