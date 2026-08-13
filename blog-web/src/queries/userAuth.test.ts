import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { loginUser, restoreUserAccount } from '@/api/userAuth'
import { logoutUser } from '@/api/userAuth'
import { useAdminAuthStore } from '@/store/auth'
import { useUserAuthStore } from '@/store/userAuth'
import { useUserLoginFlow, useUserLogoutMutation } from './userAuth'

vi.mock('@/api/userAuth', () => ({
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  restoreUserAccount: vi.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient()
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const credentials = {
  email: 'user@example.com',
  password: 'password-1',
  rememberMe: false,
}

describe('普通用户登录与恢复流程', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAdminAuthStore.getState().clearAuth()
    useUserAuthStore.getState().clearAuth()
  })

  it('登录成功保存普通用户并进入安全返回目标', async () => {
    // Given 用户从有效公开页面进入登录页
    vi.mocked(loginUser).mockResolvedValue({
      id: 2,
      email: credentials.email,
      nickname: '用户',
      avatar: null,
      token: 'user-token',
    })
    useAdminAuthStore.getState().setAuth('admin-token', {
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'admin',
    })
    const { result } = renderHook(() => useUserLoginFlow(), {
      wrapper: createWrapper(),
    })
    // When 登录接口返回包含 Token 的普通用户资料
    const response = await act(() =>
      result.current.login.mutateAsync({
        credentials,
        returnTo: '/articles/8',
      }),
    )
    // Then 只保存普通用户身份并返回该公开页面
    expect(response.redirectTo).toBe('/articles/8')
    expect(useUserAuthStore.getState().token).toBe('user-token')
    expect(useAdminAuthStore.getState().token).toBe('admin-token')
  })

  it('登录成功缺少 Token 时作为契约错误处理', async () => {
    // Given 登录接口返回用户资料但缺少 Token
    vi.mocked(loginUser).mockResolvedValue({
      id: 2,
      email: credentials.email,
      nickname: '用户',
      avatar: null,
    })
    const { result } = renderHook(() => useUserLoginFlow(), {
      wrapper: createWrapper(),
    })
    // When 登录流程处理成功响应
    await expect(
      act(() =>
        result.current.login.mutateAsync({ credentials, returnTo: '/' }),
      ),
    ).rejects.toMatchObject({ code: 'AUTH_TOKEN_MISSING' })
    // Then 不写入任何普通用户身份并返回契约错误
    expect(useUserAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('只有登录 409 才保留内存恢复上下文', async () => {
    // Given 用户提交邮箱和密码登录
    vi.mocked(loginUser).mockRejectedValue({
      code: '409',
      message: '账号正在注销',
    })
    const { result } = renderHook(() => useUserLoginFlow(), {
      wrapper: createWrapper(),
    })
    // When 登录返回待删除冲突或其他错误
    await expect(
      act(() =>
        result.current.login.mutateAsync({ credentials, returnTo: '/' }),
      ),
    ).rejects.toMatchObject({ code: '409' })
    // Then 只有 409 形成恢复上下文且不持久化密码
    await waitFor(() =>
      expect(result.current.recoveryEmail).toBe(credentials.email),
    )
    expect(JSON.stringify(localStorage)).not.toContain(credentials.password)
  })

  it('取消或恢复成功后清除恢复上下文和首次登录错误', async () => {
    // Given 登录 409 后存在仅内存恢复上下文
    vi.mocked(loginUser).mockRejectedValue({
      code: '409',
      message: '账号正在注销',
    })
    vi.mocked(restoreUserAccount).mockResolvedValue(undefined)
    const { result } = renderHook(() => useUserLoginFlow(), {
      wrapper: createWrapper(),
    })
    await expect(
      act(() =>
        result.current.login.mutateAsync({ credentials, returnTo: '/' }),
      ),
    ).rejects.toMatchObject({ code: '409' })
    await waitFor(() =>
      expect(result.current.recoveryEmail).toBe(credentials.email),
    )
    // When 用户确认恢复成功
    const restored = await act(() => result.current.restore.mutateAsync())
    // Then 清除密码、恢复上下文和用于唤起弹窗的 409，保留邮箱并提示重新登录
    expect(restoreUserAccount).toHaveBeenCalledWith({
      email: credentials.email,
      password: credentials.password,
    })
    expect(restored).toEqual({
      email: credentials.email,
      message: '账号已恢复，请重新登录',
    })
    expect(result.current.recoveryEmail).toBeNull()
    expect(result.current.login.error).toBeNull()
    expect(result.current.restore.data?.message).toBe('账号已恢复，请重新登录')

    vi.mocked(loginUser).mockRejectedValueOnce({
      code: '409',
      message: '账号正在注销',
    })
    await expect(
      act(() =>
        result.current.login.mutateAsync({ credentials, returnTo: '/' }),
      ),
    ).rejects.toMatchObject({ code: '409' })
    await waitFor(() =>
      expect(result.current.recoveryEmail).toBe(credentials.email),
    )
    act(() => result.current.cancelRecovery())
    expect(result.current.recoveryEmail).toBeNull()
    expect(result.current.login.error).toBeNull()
  })

  it('退出网络失败保留身份，成功或明确失效才清理并按来源导航', async () => {
    // Given 普通用户和管理员同时登录
    useUserAuthStore
      .getState()
      .setAuth('user-token', {
        id: 2,
        email: credentials.email,
        nickname: '用户',
        avatar: null,
      })
    useAdminAuthStore
      .getState()
      .setAuth('admin-token', {
        id: 1,
        username: 'admin',
        name: '管理员',
        role: 'admin',
      })
    vi.mocked(logoutUser).mockRejectedValueOnce({
      code: 'NETWORK_ERROR',
      message: '网络失败',
    })
    const { result } = renderHook(() => useUserLogoutMutation(), {
      wrapper: createWrapper(),
    })
    // When 退出请求失败或成功
    await expect(
      act(() => result.current.mutateAsync({ pathname: '/articles/8' })),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    // Then 网络失败保留身份，请求处理中不能重复提交
    expect(useUserAuthStore.getState().isAuthenticated).toBe(true)
    vi.mocked(logoutUser).mockResolvedValueOnce(undefined)
    await expect(
      act(() => result.current.mutateAsync({ pathname: '/profile' })),
    ).resolves.toEqual({ redirectTo: '/', replace: true })
    // Then 资料页成功退出替换首页且管理员身份保持
    expect(useUserAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAdminAuthStore.getState().isAuthenticated).toBe(true)

    useUserAuthStore.getState().setToken('expired-token')
    vi.mocked(logoutUser).mockRejectedValueOnce({
      code: '401',
      message: '登录已失效',
      status: 401,
    })
    await expect(
      act(() => result.current.mutateAsync({ pathname: '/articles/8' })),
    ).resolves.toEqual({
      redirectTo: '/articles/8',
      replace: false,
    })
    expect(useUserAuthStore.getState().isAuthenticated).toBe(false)
  })
})
