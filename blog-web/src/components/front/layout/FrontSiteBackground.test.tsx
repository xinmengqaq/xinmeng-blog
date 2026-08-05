import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePublicSiteBackgroundQuery } from '@/queries/siteConfig'
import { FrontSiteBackground } from './FrontSiteBackground'

vi.mock('@/queries/siteConfig', () => ({
  usePublicSiteBackgroundQuery: vi.fn(),
}))

describe('FrontSiteBackground', () => {
  beforeEach(() => {
    vi.mocked(usePublicSiteBackgroundQuery).mockReturnValue({
      data: { backgroundUrl: '/files/site/background.webp' },
    } as ReturnType<typeof usePublicSiteBackgroundQuery>)
  })

  it('生产环境头图加载完成后进入图片入场状态', async () => {
    // Given 站点背景地址已经返回，头图仍在加载
    render(<FrontSiteBackground />)
    const image = screen.getByRole('presentation')

    // Then 头图应高优先级加载并保持在放大淡入的起始状态
    expect(image).toHaveAttribute('loading', 'eager')
    expect(image).toHaveAttribute('fetchpriority', 'high')
    expect(image).toHaveClass('front-site-background')
    expect(image).not.toHaveClass('is-ready')

    // When 头图下载完成
    fireEvent.load(image)

    // Then 头图不等待额外解码，立即进入淡入并缩小归位的状态
    await waitFor(() => expect(image).toHaveClass('is-ready'))
  })

  it('背景接口请求失败后才显示灰色占位', () => {
    // Given 背景接口仍在请求中
    vi.mocked(usePublicSiteBackgroundQuery).mockReturnValue({
      isError: false,
    } as ReturnType<typeof usePublicSiteBackgroundQuery>)

    // When 首页等待背景接口返回
    const { container, rerender } = render(<FrontSiteBackground />)

    // Then 请求期间不应提前绘制灰色占位
    expect(container).toBeEmptyDOMElement()

    // When 背景接口最终请求失败
    vi.mocked(usePublicSiteBackgroundQuery).mockReturnValue({
      isError: true,
    } as ReturnType<typeof usePublicSiteBackgroundQuery>)
    rerender(<FrontSiteBackground />)

    // Then 才显示明确的错误占位
    expect(container.firstElementChild).toHaveClass(
      'front-image--placeholder',
      'is-error',
    )
  })

  it('背景接口成功返回空地址时显示灰色占位', () => {
    // Given 背景接口已经成功返回，且明确没有配置图片
    vi.mocked(usePublicSiteBackgroundQuery).mockReturnValue({
      data: { backgroundUrl: null },
      isError: false,
      isSuccess: true,
    } as ReturnType<typeof usePublicSiteBackgroundQuery>)

    // When 首页渲染确定的无背景结果
    const { container } = render(<FrontSiteBackground />)

    // Then 显示灰色占位，而不是继续误判为请求中
    expect(container.firstElementChild).toHaveClass(
      'front-image--placeholder',
      'is-empty',
    )
  })

  it('真实头图请求失败后显示错误占位而不播放成功入场', async () => {
    // Given 背景接口已经返回真实图片地址
    const { container } = render(<FrontSiteBackground />)

    // When 图片资源请求失败
    fireEvent.error(screen.getByRole('presentation'))

    // Then 灰色占位应直接出现，并且不会使用成功入场状态
    await waitFor(() =>
      expect(container.firstElementChild).toHaveClass('is-error'),
    )
    expect(container.firstElementChild).toHaveClass('front-image--placeholder')
    expect(container.firstElementChild).not.toHaveClass('is-ready')
  })
})
