import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getUserCaptcha } from '@/api/userAuth'
import { useAccountCaptcha } from './useAccountCaptcha'

vi.mock('@/api/userAuth', () => ({ getUserCaptcha: vi.fn() }))

describe('账户图形验证码', () => {
  afterEach(() => vi.clearAllMocks())

  it('打开时领取且刷新或发码失败后换新', async () => {
    // Given 账户流程需要图形验证码
    vi.mocked(getUserCaptcha)
      .mockResolvedValueOnce({ captchaId: 'captcha-1', imageBase64: 'image-1' })
      .mockResolvedValueOnce({ captchaId: 'captcha-2', imageBase64: 'image-2' })
      .mockResolvedValueOnce({ captchaId: 'captcha-3', imageBase64: 'image-3' })
    // When 流程打开、主动刷新或邮件发码失败
    const { result } = renderHook(() => useAccountCaptcha())
    await waitFor(() => expect(result.current.captcha?.captchaId).toBe('captcha-1'))
    act(() => result.current.setCode('A2B3'))
    await act(() => result.current.refresh())
    // Then 领取新的验证码并清空旧输入
    expect(result.current.captcha?.captchaId).toBe('captcha-2')
    expect(result.current.code).toBe('')
    act(() => result.current.setCode('C3D4'))
    await act(() => result.current.replaceAfterSendFailure())
    expect(result.current.captcha?.captchaId).toBe('captcha-3')
    expect(result.current.code).toBe('')
    act(() => result.current.rejectImage())
    expect(result.current.captcha).toBeNull()
    expect(result.current.canSubmit).toBe(false)
    expect(result.current.error).toBe('验证码图片加载失败，请重新加载')
    // Then 验证码加载失败时禁止继续发码
    vi.mocked(getUserCaptcha).mockRejectedValueOnce(new Error('down'))
    await act(() => result.current.refresh())
    expect(result.current.canSubmit).toBe(false)
  })
})
