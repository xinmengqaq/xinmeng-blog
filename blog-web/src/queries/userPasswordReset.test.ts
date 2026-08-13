import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetUserPassword, sendPasswordResetEmailCode } from '@/api/userAuth'
import { useUserPasswordResetFlow } from './userPasswordReset'

vi.mock('@/api/userAuth', () => ({
  resetUserPassword: vi.fn(),
  sendPasswordResetEmailCode: vi.fn(),
}))

const createWrapper = () => {
  const client = new QueryClient()
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client }, children)
  }
}

describe('普通用户找回密码', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('资料页入口使用当前登录邮箱作为初始值', () => {
    // Given 资料页已提供当前登录邮箱
    // When 找回密码流程初始化
    const { result } = renderHook(
      () => useUserPasswordResetFlow('user@example.com'),
      { wrapper: createWrapper() },
    )
    // Then 邮箱直接显示且未提前进入验证码阶段
    expect(result.current.email).toBe('user@example.com')
    expect(result.current.isCodeSent).toBe(false)
  })

  it('发码统一反馈且邮箱变化重置阶段', async () => {
    // Given 访客为任意邮箱完成图形验证码
    vi.mocked(sendPasswordResetEmailCode).mockResolvedValue(undefined)
    const { result } = renderHook(() => useUserPasswordResetFlow(), {
      wrapper: createWrapper(),
    })
    // When 找回密码邮件发码成功后又修改邮箱
    const response = await act(() =>
      result.current.sendCode.mutateAsync({
        email: 'missing@example.com',
        captchaId: 'captcha-1',
        captchaCode: 'A2B3',
      }),
    )
    expect(response.message).toBe('如果邮箱已注册，验证码将发送至该邮箱')
    expect(result.current.isCodeSent).toBe(true)
    expect(result.current.resendSeconds).toBe(60)
    act(() => result.current.setEmailCode('123456'))
    act(() => result.current.changeEmail('other@example.com'))
    // Then 发码结果不区分邮箱存在性且邮箱变化清除发码阶段
    expect(result.current.isCodeSent).toBe(false)
    expect(result.current.emailCode).toBe('')
    expect(result.current.resendSeconds).toBe(0)
  })

  it('新密码不一致时不请求重置接口', async () => {
    // Given 新密码和确认密码不一致
    const { result } = renderHook(() => useUserPasswordResetFlow(), {
      wrapper: createWrapper(),
    })
    act(() => result.current.setEmail('user@example.com'))
    act(() => result.current.setEmailCode('123456'))
    act(() => result.current.setNewPassword('password-1'))
    act(() => result.current.setConfirmPassword('password-2'))
    // When 用户提交密码重置
    await expect(
      act(() => result.current.reset.mutateAsync()),
    ).rejects.toMatchObject({
      code: 'PASSWORD_MISMATCH',
      field: 'confirmPassword',
    })
    // Then 前端返回字段错误且不请求后端
    expect(resetUserPassword).not.toHaveBeenCalled()
  })

  it('重置成功清空敏感输入并返回替换登录结果', async () => {
    // Given 用户完成邮件验证码和两次一致的新密码
    vi.mocked(resetUserPassword).mockResolvedValue(undefined)
    const { result } = renderHook(() => useUserPasswordResetFlow(), {
      wrapper: createWrapper(),
    })
    act(() => result.current.setEmail('user@example.com'))
    act(() => result.current.setEmailCode('123456'))
    act(() => result.current.setNewPassword('password-1'))
    act(() => result.current.setConfirmPassword('password-1'))
    // When 密码重置成功
    const response = await act(() => result.current.reset.mutateAsync())
    // Then 清空密码与验证码并返回带邮箱和成功提示的登录结果
    expect(resetUserPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      emailCode: '123456',
      newPassword: 'password-1',
    })
    expect(response).toEqual({
      email: 'user@example.com',
      message: '密码已重置，请登录',
      replace: true,
    })
    await waitFor(() => {
      expect(result.current.emailCode).toBe('')
      expect(result.current.newPassword).toBe('')
      expect(result.current.confirmPassword).toBe('')
    })
    // Then 密码和验证码不持久化且 mutation 不自动重试
    expect(JSON.stringify(localStorage)).not.toContain('password-1')
    expect(resetUserPassword).toHaveBeenCalledTimes(1)
  })
})
