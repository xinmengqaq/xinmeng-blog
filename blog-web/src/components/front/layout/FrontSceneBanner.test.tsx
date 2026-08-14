import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FrontSceneBanner } from './FrontSceneBanner'

const mocks = vi.hoisted(() => ({
  trigger: (() => {}) as (isIntersecting: boolean) => void,
  disconnect: vi.fn(),
}))

const stubIntersectionObserver = () => {
  let callback: IntersectionObserverCallback | undefined
  class IntersectionObserverStub {
    constructor(cb: IntersectionObserverCallback) {
      callback = cb
    }
    observe() {}
    unobserve() {}
    disconnect() {
      mocks.disconnect()
    }
  }
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
  mocks.trigger = (isIntersecting: boolean) => {
    callback?.([{ isIntersecting } as IntersectionObserverEntry], {
      disconnect() {},
      observe() {},
      unobserve() {},
      takeRecords: () => [],
      root: null,
      rootMargin: '',
      scrollMargin: '',
      thresholds: [0],
    })
  }
}

describe('FrontSceneBanner 波浪离屏暂停', () => {
  beforeEach(() => {
    mocks.disconnect.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('离开视口时给波浪添加暂停类', () => {
    stubIntersectionObserver()
    const view = render(<FrontSceneBanner className="station-hero" />)
    const wave = document.querySelector<HTMLDivElement>(
      '.front-scene-banner__wave',
    )

    expect(wave).not.toBeNull()
    mocks.trigger(false)
    expect(wave?.classList.contains('front-wave-paused')).toBe(true)

    view.unmount()
  })

  it('重新进入视口时移除暂停类', () => {
    stubIntersectionObserver()
    const view = render(<FrontSceneBanner className="station-hero" />)
    const wave = document.querySelector<HTMLDivElement>(
      '.front-scene-banner__wave',
    )

    mocks.trigger(false)
    expect(wave?.classList.contains('front-wave-paused')).toBe(true)
    mocks.trigger(true)
    expect(wave?.classList.contains('front-wave-paused')).toBe(false)

    view.unmount()
  })

  it('卸载时断开观察', () => {
    stubIntersectionObserver()
    const view = render(<FrontSceneBanner className="station-hero" />)

    view.unmount()

    expect(mocks.disconnect).toHaveBeenCalledOnce()
  })

  it('不支持 IntersectionObserver 的环境不改变波浪渲染', () => {
    const view = render(<FrontSceneBanner className="station-hero" />)
    const wave = document.querySelector<HTMLDivElement>(
      '.front-scene-banner__wave',
    )

    expect(wave?.classList.contains('front-wave-paused')).toBe(false)
    view.unmount()
  })
})
