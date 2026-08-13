import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { registerUser, sendRegistrationEmailCode } from '@/api/userAuth'
import { useUserAuthStore } from '@/store/userAuth'
import { consumeRegisteredEmail } from '@/utils/userFirstLogin'
import { useUserRegistrationFlow } from './userRegistration'

vi.mock('@/api/userAuth', () => ({
  registerUser: vi.fn(),
  sendRegistrationEmailCode: vi.fn(),
}))

const createWrapper = () => {
  const client = new QueryClient()
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client }, children)
  }
}

describe('普通用户分阶段注册', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    useUserAuthStore.getState().clearAuth()
  })

  it('发码成功才展开注册阶段且倒计时结束前不能重发', async () => {
    // Given 用户已填写邮箱和有效图形验证码
    vi.useFakeTimers()
    vi.mocked(sendRegistrationEmailCode).mockResolvedValue(undefined)
    const { result } = renderHook(() => useUserRegistrationFlow(), { wrapper: createWrapper() })
    // When 注册邮件发码成功
    await act(() => result.current.sendCode.mutateAsync({
      email: 'user@example.com', captchaId: 'captcha-1', captchaCode: 'A2B3',
    }))
    // Then 才进入后续注册阶段并开始倒计时
    expect(result.current.isCodeSent).toBe(true)
    expect(result.current.resendSeconds).toBe(60)
    expect(result.current.canResend).toBe(false)
    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current.resendSeconds).toBe(0)
    expect(result.current.canResend).toBe(true)
  })

  it('邮箱变化清空验证码倒计时和发码状态', async () => {
    // Given 用户已经完成邮件发码并填写邮件验证码
    vi.useFakeTimers()
    vi.mocked(sendRegistrationEmailCode).mockResolvedValue(undefined)
    const { result } = renderHook(() => useUserRegistrationFlow(), { wrapper: createWrapper() })
    await act(() => result.current.sendCode.mutateAsync({
      email: 'user@example.com', captchaId: 'captcha-1', captchaCode: 'A2B3',
    }))
    act(() => result.current.setEmailCode('123456'))
    // When 用户修改邮箱
    act(() => result.current.changeEmail('new@example.com'))
    // Then 清除邮件验证码、倒计时和发码状态并要求重新发码
    expect(result.current.emailCode).toBe('')
    expect(result.current.isCodeSent).toBe(false)
    expect(result.current.resendSeconds).toBe(0)
  })

  it('注册成功不登录不保存密码并返回登录邮箱', async () => {
    // Given 用户完成注册表单
    vi.mocked(registerUser).mockResolvedValue(undefined)
    const { result } = renderHook(() => useUserRegistrationFlow(), { wrapper: createWrapper() })
    const input = {
      email: 'user@example.com', emailCode: '123456',
      nickname: '用户', password: 'password-1',
    }
    // When 注册接口成功
    const response = await act(() => result.current.register.mutateAsync(input))
    // Then 不写入登录态和密码，只返回登录页需要的邮箱
    expect(response).toEqual({ email: input.email })
    expect(useUserAuthStore.getState().isAuthenticated).toBe(false)
    expect(JSON.stringify(localStorage)).not.toContain(input.password)
    expect(consumeRegisteredEmail(input.email)).toBe(true)
  })
})
