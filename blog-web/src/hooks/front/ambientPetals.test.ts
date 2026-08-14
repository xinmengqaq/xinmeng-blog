import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAmbientPetals } from './ambientPetals'

const createCanvasContext = () => ({
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  drawImage: vi.fn(),
  setTransform: vi.fn(),
  globalAlpha: 1,
})

const setDocumentHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', {
    value: hidden,
    configurable: true,
  })
}

const runNextFrame = () => {
  const callback = vi
    .mocked(window.requestAnimationFrame)
    .mock.calls.at(-1)?.[0]
  callback?.(16)
  vi.mocked(window.requestAnimationFrame).mockClear()
}

describe('useAmbientPetals', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'Image',
      class ImageStub {
        naturalWidth = 100
        src = ''
        addEventListener() {}
        removeEventListener() {}
      },
    )
  })

  afterEach(() => {
    setDocumentHidden(false)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('关闭时不创建渲染器、不启动帧循环', () => {
    const canvas = document.createElement('canvas')
    const getContext = vi.spyOn(canvas, 'getContext')
    const rAF = vi.spyOn(window, 'requestAnimationFrame')
    const ref = { current: canvas }

    renderHook(() => useAmbientPetals(ref, false))

    expect(getContext).not.toHaveBeenCalled()
    expect(rAF).not.toHaveBeenCalled()
  })

  it('启用后启动帧循环并绘制花瓣', () => {
    const canvas = document.createElement('canvas')
    const context = createCanvasContext()
    vi.spyOn(canvas, 'getContext').mockReturnValue(context as never)
    const rAF = vi.spyOn(window, 'requestAnimationFrame')
    const ref = { current: canvas }

    renderHook(() => useAmbientPetals(ref, true))
    expect(rAF).toHaveBeenCalled()

    runNextFrame()
    expect(context.clearRect).toHaveBeenCalled()
    expect(context.drawImage).toHaveBeenCalled()
  })

  it('文档不可见时停止帧循环，恢复可见时重启', () => {
    const canvas = document.createElement('canvas')
    const context = createCanvasContext()
    vi.spyOn(canvas, 'getContext').mockReturnValue(context as never)
    const rAF = vi.spyOn(window, 'requestAnimationFrame')
    const cAF = vi.spyOn(window, 'cancelAnimationFrame')
    const ref = { current: canvas }

    renderHook(() => useAmbientPetals(ref, true))
    expect(rAF).toHaveBeenCalledTimes(1)

    setDocumentHidden(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(cAF).toHaveBeenCalled()

    rAF.mockClear()
    setDocumentHidden(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(rAF).toHaveBeenCalledTimes(1)
  })

  it('卸载时停止循环并清空画布', () => {
    const canvas = document.createElement('canvas')
    const context = createCanvasContext()
    vi.spyOn(canvas, 'getContext').mockReturnValue(context as never)
    const rAF = vi.spyOn(window, 'requestAnimationFrame')
    const cAF = vi.spyOn(window, 'cancelAnimationFrame')
    const ref = { current: canvas }

    const view = renderHook(() => useAmbientPetals(ref, true))
    expect(rAF).toHaveBeenCalled()

    view.unmount()

    expect(cAF).toHaveBeenCalled()
    expect(context.clearRect).toHaveBeenCalled()
  })

  it('窗口尺寸变化时重建画布与粒子', () => {
    const canvas = document.createElement('canvas')
    const context = createCanvasContext()
    vi.spyOn(canvas, 'getContext').mockReturnValue(context as never)
    vi.spyOn(window, 'requestAnimationFrame')
    const ref = { current: canvas }

    renderHook(() => useAmbientPetals(ref, true))

    window.dispatchEvent(new Event('resize'))

    expect(context.setTransform).toHaveBeenCalled()
  })
})
