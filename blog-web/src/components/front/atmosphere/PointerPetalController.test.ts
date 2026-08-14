import gsap from 'gsap'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PointerPetalController } from './PointerPetalController'

const TICKER_IDLE_TIMEOUT = 600

const pointerEvent = (x: number, y: number) =>
  ({ clientX: x, clientY: y, target: document.body }) as unknown as PointerEvent

describe('PointerPetalController ticker 按需注册', () => {
  let addSpy: ReturnType<typeof vi.spyOn>
  let controller: PointerPetalController
  let tickTrail: (() => void) | undefined

  const isRegistered = () =>
    (
      gsap.ticker as unknown as { _listeners: Array<() => void> }
    )._listeners.includes(tickTrail as () => void)

  const createController = () => {
    const follower = document.createElement('img')
    const trail = Array.from({ length: 18 }, () =>
      document.createElement('span'),
    )
    const particles = Array.from({ length: 8 }, () =>
      document.createElement('span'),
    )
    controller = new PointerPetalController({ follower, trail, particles })
    tickTrail = (controller as unknown as { tickTrail: () => void }).tickTrail
    return controller
  }

  beforeEach(() => {
    addSpy = vi.spyOn(gsap.ticker, 'add')
    vi.spyOn(gsap.ticker, 'remove')
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    addSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('构造时不注册 ticker', () => {
    createController()
    expect(isRegistered()).toBe(false)
  })

  it('指针移动时注册一次，连续移动不重复注册', () => {
    const controller = createController()
    controller.move(pointerEvent(10, 10))
    controller.move(pointerEvent(20, 20))
    controller.move(pointerEvent(30, 30))

    expect(isRegistered()).toBe(true)
    expect(addSpy).toHaveBeenCalledTimes(1)
  })

  it('指针静止超过空闲阈值后移除 ticker', () => {
    const controller = createController()
    controller.move(pointerEvent(10, 10))
    expect(isRegistered()).toBe(true)

    vi.advanceTimersByTime(TICKER_IDLE_TIMEOUT)

    expect(isRegistered()).toBe(false)
  })

  it('再次移动时重新注册', () => {
    const controller = createController()
    controller.move(pointerEvent(10, 10))
    vi.advanceTimersByTime(TICKER_IDLE_TIMEOUT)
    expect(isRegistered()).toBe(false)

    controller.move(pointerEvent(50, 50))
    expect(isRegistered()).toBe(true)
    expect(addSpy).toHaveBeenCalledTimes(2)
  })

  it('销毁时移除 ticker 并清除待执行的空闲计时', () => {
    const controller = createController()
    controller.move(pointerEvent(10, 10))

    controller.destroy()

    expect(isRegistered()).toBe(false)
    vi.advanceTimersByTime(TICKER_IDLE_TIMEOUT)
    expect(isRegistered()).toBe(false)
  })

  it('失活（隐藏）时移除 ticker，再次移动恢复', () => {
    const controller = createController()
    controller.move(pointerEvent(10, 10))
    expect(isRegistered()).toBe(true)

    controller.deactivate()
    expect(isRegistered()).toBe(false)

    controller.move(pointerEvent(60, 60))
    expect(isRegistered()).toBe(true)
  })

  it('文档隐藏时指针事件不注册 ticker', () => {
    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
    })
    const controller = createController()
    controller.move(pointerEvent(10, 10))
    expect(isRegistered()).toBe(false)
    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
    })
  })

  it('销毁后不会再有空闲计时触发注册', () => {
    const controller = createController()
    controller.move(pointerEvent(10, 10))
    controller.destroy()

    vi.advanceTimersByTime(TICKER_IDLE_TIMEOUT)
    expect(addSpy).toHaveBeenCalledTimes(1)
  })
})
