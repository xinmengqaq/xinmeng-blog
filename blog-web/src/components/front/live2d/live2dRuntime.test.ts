import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FrontLive2DModelConfig } from '@/config/frontLive2D'

import { mountFrontLive2D } from './live2dRuntime'

type Lifecycle = {
  listeners: Array<[EventTarget, (event: Event) => void, unknown]>
  intervals: Set<number>
  model: { stop: () => void; run: () => void; release: () => void } | null
  pauseRequested: boolean
  disposed: boolean
  generation: number
  clear: () => void
}

const MODEL: FrontLive2DModelConfig = {
  waifuPath: '/live2d/config/waifu-tips.json',
  cubism5Path: '/live2d/runtime/live2dcubismcore.min.js',
  supportsModelSwitch: false,
  supportsTextureSwitch: false,
}

type TestWindow = Window & {
  __live2dLifecycle?: unknown
  initWidget?: unknown
}

const getTestWindow = () => window as unknown as TestWindow

const getLifecycle = () =>
  getTestWindow().__live2dLifecycle as unknown as Lifecycle

const appendWidget = () => {
  const widget = document.createElement('div')
  widget.id = 'waifu'
  document.body.append(widget)
  return widget
}

const setDocumentHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', {
    value: hidden,
    configurable: true,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

const flushMicrotasks = () =>
  new Promise((resolve) => window.setTimeout(resolve, 0))

describe('live2dRuntime 生命周期', () => {
  let initWidget: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    await import('live2d-widgets/dist/waifu-tips.js')
    initWidget = vi.fn(() => {
      appendWidget()
    })
    getTestWindow().initWidget = initWidget as unknown
    const lifecycle = getLifecycle()
    lifecycle.listeners = []
    lifecycle.intervals = new Set()
    lifecycle.model = null
    lifecycle.pauseRequested = false
    lifecycle.disposed = false
    lifecycle.generation = 0
  })

  afterEach(() => {
    document
      .querySelectorAll('#waifu, #waifu-toggle')
      .forEach((node) => node.remove())
    delete getTestWindow().initWidget
    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
    })
  })

  it('挂载时初始化第三方并登记文档可见性监听', async () => {
    const instance = await mountFrontLive2D(MODEL, ['hitokoto', 'quit'])

    expect(initWidget).toHaveBeenCalledWith(
      expect.objectContaining({ waifuPath: MODEL.waifuPath }),
    )
    instance.cleanup()
  })

  it('没有第三方初始化函数时抛出错误且不残留节点', async () => {
    delete getTestWindow().initWidget

    await expect(mountFrontLive2D(MODEL, ['quit'])).rejects.toThrow(
      'Live2D widget failed to initialize',
    )
    expect(document.getElementById('waifu')).toBeNull()
  })

  it('挂件被用户关闭（waifu-hidden）时暂停渲染循环', async () => {
    const instance = await mountFrontLive2D(MODEL, ['quit'])
    const lifecycle = getLifecycle()
    const model = { stop: vi.fn(), run: vi.fn(), release: vi.fn() }
    lifecycle.model = model

    document.getElementById('waifu')?.classList.add('waifu-hidden')
    await flushMicrotasks()

    expect(model.stop).toHaveBeenCalledOnce()
    expect(lifecycle.pauseRequested).toBe(true)
    instance.cleanup()
  })

  it('召回（移除 waifu-hidden）时只恢复原实例，不重新初始化', async () => {
    const instance = await mountFrontLive2D(MODEL, ['quit'])
    const lifecycle = getLifecycle()
    const model = { stop: vi.fn(), run: vi.fn(), release: vi.fn() }
    lifecycle.model = model
    const widget = document.getElementById('waifu')

    widget?.classList.add('waifu-hidden')
    await flushMicrotasks()
    widget?.classList.remove('waifu-hidden')
    await flushMicrotasks()

    expect(model.run).toHaveBeenCalledOnce()
    expect(model.run.mock.calls[0]?.[0]).toBeUndefined()
    expect(initWidget).toHaveBeenCalledOnce()
    expect(lifecycle.pauseRequested).toBe(false)
    instance.cleanup()
  })

  it('头图遮挡（live2d-is-over-banner）时暂停，遮挡解除时恢复', async () => {
    const instance = await mountFrontLive2D(MODEL, ['quit'])
    const lifecycle = getLifecycle()
    const model = { stop: vi.fn(), run: vi.fn(), release: vi.fn() }
    lifecycle.model = model
    const widget = document.getElementById('waifu')

    widget?.classList.add('live2d-is-over-banner')
    await flushMicrotasks()
    expect(model.stop).toHaveBeenCalledOnce()

    widget?.classList.remove('live2d-is-over-banner')
    await flushMicrotasks()
    expect(model.run).toHaveBeenCalledOnce()
    instance.cleanup()
  })

  it('文档不可见时暂停，恢复可见时恢复', async () => {
    const instance = await mountFrontLive2D(MODEL, ['quit'])
    const lifecycle = getLifecycle()
    const model = { stop: vi.fn(), run: vi.fn(), release: vi.fn() }
    lifecycle.model = model

    setDocumentHidden(true)
    expect(model.stop).toHaveBeenCalledOnce()

    setDocumentHidden(false)
    expect(model.run).toHaveBeenCalledOnce()
    instance.cleanup()
  })

  it('卸载时完整释放模型循环、定时器、监听器与节点', async () => {
    const instance = await mountFrontLive2D(MODEL, ['quit'])
    const lifecycle = getLifecycle()
    const model = { stop: vi.fn(), run: vi.fn(), release: vi.fn() }
    lifecycle.model = model
    lifecycle.listeners.push([window, vi.fn(), undefined])
    lifecycle.intervals.add(1)

    instance.cleanup()

    expect(model.release).toHaveBeenCalledOnce()
    expect(lifecycle.disposed).toBe(true)
    expect(lifecycle.listeners).toEqual([])
    expect(lifecycle.intervals.size).toBe(0)
    expect(lifecycle.model).toBeNull()
    expect(document.getElementById('waifu')).toBeNull()
  })

  it('卸载后挂件节点变化不再触发暂停或恢复', async () => {
    const instance = await mountFrontLive2D(MODEL, ['quit'])
    const lifecycle = getLifecycle()
    const model = { stop: vi.fn(), run: vi.fn(), release: vi.fn() }
    lifecycle.model = model

    instance.cleanup()
    document.getElementById('waifu')?.classList.add('waifu-hidden')
    await flushMicrotasks()

    expect(model.stop).not.toHaveBeenCalled()
  })
})
