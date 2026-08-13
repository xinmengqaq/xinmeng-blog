import { afterEach, describe, expect, it, vi } from 'vitest'

import { publicRequest } from '@/utils/request'

import { getPublicSiteBackground } from './siteConfig'

vi.mock('@/utils/request', () => ({
  publicRequest: {
    get: vi.fn(),
  },
}))

describe('公开站点背景 API', () => {
  afterEach(() => vi.clearAllMocks())

  it('有值、null 和缺字段的公开背景响应都归一为可空 backgroundUrl', async () => {
    // Given 后端分别返回背景地址、null 或未包含 backgroundUrl
    // When 前端读取公开站点背景接口响应
    // Then 客户端稳定提供 string 或 null，且不把缺字段暴露给页面
    vi.mocked(publicRequest.get)
      .mockResolvedValueOnce({ backgroundUrl: '/files/site/background.webp' })
      .mockResolvedValueOnce({ backgroundUrl: null })
      .mockResolvedValueOnce({})

    await expect(getPublicSiteBackground()).resolves.toEqual({
      backgroundUrl: '/files/site/background.webp',
    })
    await expect(getPublicSiteBackground()).resolves.toEqual({
      backgroundUrl: null,
    })
    await expect(getPublicSiteBackground()).resolves.toEqual({
      backgroundUrl: null,
    })
  })

  it('公开背景只请求独立公开接口', async () => {
    // Given 前台需要读取当前站点背景
    // When 客户端发起背景请求
    // Then 请求 GET /site-config/background，且不访问任何管理接口或 /home
    vi.mocked(publicRequest.get).mockResolvedValue({ backgroundUrl: null })

    await getPublicSiteBackground()

    expect(publicRequest.get).toHaveBeenCalledWith('/site-config/background')
  })
})
