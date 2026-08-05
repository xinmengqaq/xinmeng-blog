import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { publicContentQueryKeys } from '@/queries/publicContent'
import { usePageTransitionActive } from './pageTransition'

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: PropsWithChildren) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: ['/'] }, children),
    )
  }

describe('前台页面圆环过渡', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('首次进入首页时应覆盖真实主请求且不等待页面动画', async () => {
    // Given 完整页面首次进入首页，首页主请求仍未完成
    vi.useFakeTimers()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    let resolveRequest!: (value: {
      featuredArticles: []
      latestArticles: []
    }) => void
    const request = new Promise<{ featuredArticles: []; latestArticles: [] }>(
      (resolve) => {
        resolveRequest = resolve
      },
    )
    const fetching = queryClient.fetchQuery({
      queryKey: publicContentQueryKeys.home(),
      queryFn: () => request,
    })

    // When 共享前台布局读取当前页面等待状态
    const { result } = renderHook(() => usePageTransitionActive(), {
      wrapper: createWrapper(queryClient),
    })

    // Then 圆环立即生效，并只跟随请求和最短可见时间
    expect(result.current).toBe(true)
    await act(async () => {
      resolveRequest!({ featuredArticles: [], latestArticles: [] })
      await fetching
    })
    expect(result.current).toBe(true)

    act(() => vi.advanceTimersByTime(450))
    expect(result.current).toBe(false)
  })

  it('首页缓存新鲜且没有请求时不显示圆环', () => {
    // Given 首页数据已在缓存中且当前没有网络请求
    const queryClient = new QueryClient()
    queryClient.setQueryData(publicContentQueryKeys.home(), {
      featuredArticles: [],
      latestArticles: [],
    })

    // When 共享前台布局读取当前页面等待状态
    const { result } = renderHook(() => usePageTransitionActive(), {
      wrapper: createWrapper(queryClient),
    })

    // Then 不为展示动画而伪造圆环等待
    expect(result.current).toBe(false)
  })
})
