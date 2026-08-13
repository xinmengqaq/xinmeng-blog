import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  cancelUserAccount,
  changeUserEmail,
  changeUserPassword,
  sendUserEmailChangeCode,
} from '@/api/userProfile'
import { useAdminAuthStore } from '@/store/auth'
import { useUserAuthStore } from '@/store/userAuth'
import { useUserAccountSecurity } from './userAccountSecurity'

vi.mock('@/api/userProfile', () => ({
  cancelUserAccount: vi.fn(),
  changeUserEmail: vi.fn(),
  changeUserPassword: vi.fn(),
  sendUserEmailChangeCode: vi.fn(),
}))

const createWrapper = () => {
  const client = new QueryClient()
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client }, children)
  }
}

describe('普通用户账户安全流程', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAdminAuthStore.getState().clearAuth()
    useUserAuthStore.getState().clearAuth()
  })

  it('改邮箱发码和确认成功后返回新邮箱并清理登录态', async () => {
    // Given 用户提交当前密码、新邮箱和邮件验证码
    vi.mocked(sendUserEmailChangeCode).mockResolvedValue({ message: '验证码已发送' })
    vi.mocked(changeUserEmail).mockResolvedValue({
      id: 2, email: 'new@example.com', nickname: '用户', avatar: null,
    })
    useUserAuthStore.getState().setAuth('user-token', {
      id: 2, email: 'old@example.com', nickname: '用户', avatar: null,
    })
    const { result } = renderHook(() => useUserAccountSecurity(), { wrapper: createWrapper() })
    // When 改邮箱接口成功
    await act(() => result.current.sendEmailCode.mutateAsync({
      currentPassword: 'password-1', newEmail: 'new@example.com', captchaId: 'captcha-1', captchaCode: 'A2B3',
    }))
    const response = await act(() => result.current.changeEmail.mutateAsync({
      currentPassword: 'password-1', newEmail: 'new@example.com', emailCode: '123456',
    }))
    // Then 清理普通用户状态并返回带新邮箱的重新登录结果
    expect(response).toEqual({ email: 'new@example.com', message: '邮箱修改成功，请重新登录', replace: true })
    expect(useUserAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('改密码不一致时不请求且成功后重新登录', async () => {
    // Given 新密码和确认密码不一致或当前密码错误
    vi.mocked(changeUserPassword).mockResolvedValue(undefined)
    useUserAuthStore.getState().setToken('user-token')
    const { result } = renderHook(() => useUserAccountSecurity(), { wrapper: createWrapper() })
    // When 用户提交改密码
    await expect(act(() => result.current.changePassword.mutateAsync({
      currentPassword: 'password-1', newPassword: 'password-2', confirmPassword: 'different',
    }))).rejects.toMatchObject({ code: 'PASSWORD_MISMATCH' })
    // Then 不一致时不请求，当前密码错误时保留登录态
    expect(changeUserPassword).not.toHaveBeenCalled()
    const error = { code: 'CURRENT_PASSWORD_INVALID', message: '当前密码错误' }
    vi.mocked(changeUserPassword).mockRejectedValueOnce(error)
    await expect(act(() => result.current.changePassword.mutateAsync({
      currentPassword: 'password-1', newPassword: 'password-2', confirmPassword: 'password-2',
    }))).rejects.toEqual(error)
    expect(useUserAuthStore.getState().isAuthenticated).toBe(true)
    // Then 成功后清理普通用户状态并要求重新登录
    vi.mocked(changeUserPassword).mockResolvedValueOnce(undefined)
    await act(() => result.current.changePassword.mutateAsync({
      currentPassword: 'password-1', newPassword: 'password-2', confirmPassword: 'password-2',
    }))
    expect(useUserAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('注销邮箱不匹配时不请求且成功返回删除时间', async () => {
    // Given 用户输入的确认邮箱与资料邮箱不一致或一致
    useUserAuthStore.getState().setAuth('user-token', {
      id: 2, email: 'old@example.com', nickname: '用户', avatar: null,
    })
    vi.mocked(cancelUserAccount).mockResolvedValue({ deleteAt: '2026-08-19T18:00:00+08:00' })
    const { result } = renderHook(() => useUserAccountSecurity(), { wrapper: createWrapper() })
    // When 用户提交注销
    await expect(act(() => result.current.cancelAccount.mutateAsync({ confirmEmail: 'other@example.com' }))).rejects.toMatchObject({ code: 'EMAIL_MISMATCH' })
    // Then 不一致时不请求
    expect(cancelUserAccount).not.toHaveBeenCalled()
    const response = await act(() => result.current.cancelAccount.mutateAsync({ confirmEmail: 'old@example.com' }))
    // Then 成功返回 deleteAt 并清理普通用户状态，失败保留身份
    expect(response.deleteAt).toBe('2026-08-19T18:00:00+08:00')
    expect(useUserAuthStore.getState().isAuthenticated).toBe(false)
  })
})
