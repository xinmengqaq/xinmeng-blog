import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FrontPageScrollbar } from './FrontPageScrollbar'

const stubDesktopPointer = () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

const stubResizeObserver = () => {
  class ResizeObserverStub {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
}

describe('FrontPageScrollbar 滚动合帧', () => {
  let clientHeightSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stubDesktopPointer()
    stubResizeObserver()
    vi.useFakeTimers()
    clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    clientHeightSpy.mockRestore()
  })

  it('同一帧内多次滚动只执行一次几何更新', () => {
    render(<FrontPageScrollbar />)
    const baseline = clientHeightSpy.mock.calls.length

    fireEvent.scroll(window)
    fireEvent.scroll(window)
    fireEvent.scroll(window)

    expect(clientHeightSpy.mock.calls.length).toBe(baseline)

    vi.advanceTimersByTime(16)

    expect(clientHeightSpy.mock.calls.length).toBe(baseline + 2)
  })

  it('卸载时取消待执行的合帧', () => {
    const view = render(<FrontPageScrollbar />)
    const baseline = clientHeightSpy.mock.calls.length

    fireEvent.scroll(window)
    view.unmount()
    vi.advanceTimersByTime(16)

    expect(clientHeightSpy.mock.calls.length).toBe(baseline)
  })

  it('滚动触发临时显示，空闲后隐藏', () => {
    const view = render(<FrontPageScrollbar />)
    const track = document.querySelector<HTMLDivElement>(
      '.front-page-scrollbar',
    )

    fireEvent.scroll(window)
    vi.advanceTimersByTime(16)

    expect(track?.classList.contains('is-visible')).toBe(true)

    vi.advanceTimersByTime(650)
    expect(track?.classList.contains('is-visible')).toBe(false)

    view.unmount()
  })
})
