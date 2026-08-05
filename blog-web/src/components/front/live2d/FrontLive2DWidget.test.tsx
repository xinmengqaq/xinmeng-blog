import { StrictMode } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FrontLive2DWidget } from './FrontLive2DWidget'
import { selectFrontLive2DTools } from './live2dTools'

type TestModelConfig = {
  waifuPath: string
  cubism5Path: string
  supportsModelSwitch: boolean
  supportsTextureSwitch: boolean
}

const mocks = vi.hoisted(() => ({
  config: {
    desktopMediaQuery: '(min-width: 768px)',
    model: null as TestModelConfig | null,
  },
  mount: vi.fn(),
}))

vi.mock('@/config/frontLive2D', () => ({
  frontLive2DConfig: mocks.config,
}))

vi.mock('./live2dRuntime', () => ({
  mountFrontLive2D: mocks.mount,
}))

const setDesktopViewport = (matches: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

const renderWidget = () =>
  render(
    <MemoryRouter>
      <FrontLive2DWidget />
    </MemoryRouter>,
  )

const appendBanner = (initialBottom: number) => {
  const banner = document.createElement('section')
  let bottom = initialBottom
  banner.className = 'front-scene-banner'
  vi.spyOn(banner, 'getBoundingClientRect').mockImplementation(
    () => ({ bottom }) as DOMRect,
  )
  document.body.append(banner)

  return (nextBottom: number) => {
    bottom = nextBottom
  }
}

describe('FrontLive2DWidget', () => {
  beforeEach(() => {
    mocks.config.model = null
    mocks.mount.mockReset()
    setDesktopViewport(true)
  })

  afterEach(() => {
    document
      .querySelectorAll('.front-scene-banner')
      .forEach((node) => node.remove())
    vi.unstubAllGlobals()
  })

  it('没有模型配置时不加载 Live2D 运行时', () => {
    renderWidget()

    expect(mocks.mount).not.toHaveBeenCalled()
  })

  it('移动端即使存在模型配置也不加载 Live2D 运行时', () => {
    mocks.config.model = {
      waifuPath: '/live2d/config/waifu-tips.json',
      cubism5Path: '/live2d/runtime/live2dcubismcore.min.js',
      supportsModelSwitch: false,
      supportsTextureSwitch: false,
    }
    setDesktopViewport(false)

    renderWidget()

    expect(mocks.mount).not.toHaveBeenCalled()
  })

  it('缺少 Cubism Core 地址时不加载 Live2D 运行时', () => {
    mocks.config.model = {
      waifuPath: '/live2d/config/waifu-tips.json',
      cubism5Path: '',
      supportsModelSwitch: false,
      supportsTextureSwitch: false,
    }

    renderWidget()

    expect(mocks.mount).not.toHaveBeenCalled()
  })

  it('桌面端存在模型配置时加载运行时并在卸载时清理', async () => {
    const cleanup = vi.fn()
    const model = {
      waifuPath: '/live2d/config/waifu-tips.json',
      cubism5Path: '/live2d/runtime/live2dcubismcore.min.js',
      supportsModelSwitch: true,
      supportsTextureSwitch: false,
    }
    mocks.config.model = model
    mocks.mount.mockResolvedValue(cleanup)

    const view = renderWidget()

    await waitFor(() =>
      expect(mocks.mount).toHaveBeenCalledWith(model, [
        'hitokoto',
        'switch-model',
        'photo',
        'quit',
      ]),
    )

    view.unmount()
    await waitFor(() => expect(cleanup).toHaveBeenCalledOnce())
  })

  it('刷新时头图仍覆盖触发线则滚过后才加载一次运行时', async () => {
    const cleanup = vi.fn()
    const model = {
      waifuPath: '/live2d/config/waifu-tips.json',
      cubism5Path: '/live2d/runtime/live2dcubismcore.min.js',
      supportsModelSwitch: false,
      supportsTextureSwitch: false,
    }
    mocks.config.model = model
    mocks.mount.mockResolvedValue(cleanup)
    const setBannerBottom = appendBanner(window.innerHeight)

    const view = renderWidget()

    await new Promise((resolve) => window.setTimeout(resolve, 0))
    expect(mocks.mount).not.toHaveBeenCalled()

    setBannerBottom(window.innerHeight - 285)
    fireEvent.scroll(window)

    await waitFor(() => expect(mocks.mount).toHaveBeenCalledOnce())

    fireEvent.scroll(window)
    expect(mocks.mount).toHaveBeenCalledOnce()

    view.unmount()
    await waitFor(() => expect(cleanup).toHaveBeenCalledOnce())
  })

  it('运行时加载失败时不影响组件卸载', async () => {
    mocks.config.model = {
      waifuPath: '/live2d/config/waifu-tips.json',
      cubism5Path: '/live2d/runtime/live2dcubismcore.min.js',
      supportsModelSwitch: false,
      supportsTextureSwitch: false,
    }
    mocks.mount.mockRejectedValue(new Error('load failed'))

    const view = renderWidget()

    await waitFor(() => expect(mocks.mount).toHaveBeenCalledOnce())
    expect(() => view.unmount()).not.toThrow()
  })

  it('React StrictMode 下只挂载一次运行时', async () => {
    mocks.config.model = {
      waifuPath: '/live2d/config/waifu-tips.json',
      cubism5Path: '/live2d/runtime/live2dcubismcore.min.js',
      supportsModelSwitch: false,
      supportsTextureSwitch: false,
    }
    mocks.mount.mockResolvedValue(vi.fn())

    render(
      <MemoryRouter>
        <StrictMode>
          <FrontLive2DWidget />
        </StrictMode>
      </MemoryRouter>,
    )

    await waitFor(() => expect(mocks.mount).toHaveBeenCalledOnce())
  })
})

describe('selectFrontLive2DTools', () => {
  it('单模型单纹理只保留首版基础工具', () => {
    expect(
      selectFrontLive2DTools({
        supportsModelSwitch: false,
        supportsTextureSwitch: false,
      }),
    ).toEqual(['hitokoto', 'photo', 'quit'])
  })

  it('模型声明对应能力时增加切模和换装工具', () => {
    expect(
      selectFrontLive2DTools({
        supportsModelSwitch: true,
        supportsTextureSwitch: true,
      }),
    ).toEqual(['hitokoto', 'switch-model', 'switch-texture', 'photo', 'quit'])
  })
})
