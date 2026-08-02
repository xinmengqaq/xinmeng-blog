import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useFrontMotionPreference } from './motionPreference'
import { usePetalPreference } from './petalPreference'

describe('前台动效偏好', () => {
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('旧全局关闭值不能关闭动效，花瓣偏好只控制飘落 Canvas', () => {
    // Given 设备保存了旧的全局关闭值，并且访客关闭了花瓣飘落
    // When 前台读取全局动效与花瓣偏好
    // Then 全局动效仍应运行，只有花瓣飘落保持关闭
    localStorage.setItem('front-motion-enabled', 'false')
    localStorage.setItem('front-motion-preference-version', '2')
    localStorage.setItem('front-petals-enabled', 'false')
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    const motion = renderHook(() => useFrontMotionPreference())
    const petals = renderHook(() => usePetalPreference())

    expect(motion.result.current.motionAllowed).toBe(true)
    expect(petals.result.current.enabled).toBe(false)
    expect(localStorage.getItem('front-motion-enabled')).toBeNull()
    expect(localStorage.getItem('front-motion-preference-version')).toBeNull()

    act(() => petals.result.current.setEnabled(true))
    expect(petals.result.current.enabled).toBe(true)
    expect(localStorage.getItem('front-petals-enabled')).toBe('true')
  })
})
