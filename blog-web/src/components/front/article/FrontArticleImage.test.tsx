import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FrontArticleImage } from './FrontArticleImage'

describe('FrontArticleImage', () => {
  it('接口成功返回空封面时显示灰色占位', () => {
    // Given 文章接口已经成功返回，但封面地址为空
    render(<FrontArticleImage src={null} alt="文章头图" />)

    // When 页面渲染文章的固定比例媒体区
    const media = screen.getByRole('img', { name: '文章头图图片占位' })

    // Then 空封面作为确定的无图结果显示灰色占位
    expect(media).toHaveClass('front-image--placeholder')
  })

  it('图片加载完成后立即通知外层可以显示', () => {
    // Given 头图需要高优先级加载，并使用异步解码
    const onReady = vi.fn()
    render(
      <FrontArticleImage
        src="/cover.webp"
        alt="文章头图"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onReady={onReady}
      />,
    )
    const image = screen.getByRole('img', { name: '文章头图' })

    // When 图片触发加载完成
    fireEvent.load(image)

    // Then 浏览器应优先请求头图，且外层立即开始短显现动画
    expect(image).toHaveAttribute('loading', 'eager')
    expect(image).toHaveAttribute('decoding', 'async')
    expect(image).toHaveAttribute('fetchpriority', 'high')
    expect(onReady).toHaveBeenCalledOnce()
    expect(onReady).toHaveBeenCalledWith('loaded')
  })

  it('图片加载失败后通知外层显示错误占位', () => {
    // Given 头图已经开始加载，外层需要区分成功图片和错误占位
    const onReady = vi.fn()
    render(
      <FrontArticleImage src="/broken.webp" alt="文章头图" onReady={onReady} />,
    )

    // When 图片请求失败
    fireEvent.error(screen.getByRole('img', { name: '文章头图' }))

    // Then 图片切换为占位，并把失败结果通知外层
    expect(
      screen.getByRole('img', { name: '文章头图图片占位' }),
    ).toBeInTheDocument()
    expect(onReady).toHaveBeenCalledWith('failed')
  })
})
