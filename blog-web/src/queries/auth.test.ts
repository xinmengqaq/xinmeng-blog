import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { login } from '@/api/auth'
import {
  changeAdminPassword,
  getAdminProfile,
  refreshAdminToken,
  updateAdminProfile,
  validateAdminToken,
} from '@/api/admin'
import { useAuthStore } from '@/store/auth'
import type { AdminVO } from '@/types/auth'

import { useLoginMutation } from './auth'
import {
  useAdminProfileQuery,
  useChangeAdminPasswordMutation,
  useRefreshAdminTokenMutation,
  useUpdateAdminProfileMutation,
  useValidateAdminTokenMutation,
} from './admin'

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('@/api/admin', () => ({
  changeAdminPassword: vi.fn(),
  getAdminProfile: vi.fn(),
  refreshAdminToken: vi.fn(),
  updateAdminProfile: vi.fn(),
  validateAdminToken: vi.fn(),
}))

const adminVO = (overrides: Partial<AdminVO> = {}): AdminVO => ({
  id: 1,
  username: 'admin',
  name: '梦梦',
  role: 'admin',
  avatar: '/files/avatar.png',
  ...overrides,
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('后台登录 Query', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  it('后台登录成功后应从 AdminVO 保存 Token 和管理员资料', async () => {
    vi.mocked(login).mockResolvedValue(adminVO({ token: 'token-1' }))

    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      username: 'admin',
      password: 'secret',
      captchaID: 'captcha-id-1',
      captchaCode: 'A2B3',
    })

    expect(useAuthStore.getState().token).toBe('token-1')
    expect(useAuthStore.getState().currentUser).toEqual({
      id: 1,
      username: 'admin',
      name: '梦梦',
      role: 'admin',
      avatar: '/files/avatar.png',
    })
  })
})

describe('管理员资料 Query', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  it('加载管理员资料成功后应更新 currentUser', async () => {
    vi.mocked(getAdminProfile).mockResolvedValue(adminVO({ name: '新梦梦' }))

    const { result } = renderHook(() => useAdminProfileQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(useAuthStore.getState().currentUser).toMatchObject({
      name: '新梦梦',
      username: 'admin',
      role: 'admin',
    })
  })

  it('保存管理员资料成功后应更新 currentUser', async () => {
    useAuthStore.getState().setAuth('old-token', adminVO())
    vi.mocked(updateAdminProfile).mockResolvedValue(
      adminVO({
        username: 'xinmengqaq',
        name: '新梦梦',
        avatar: '/files/new.png',
      }),
    )

    const { result } = renderHook(() => useUpdateAdminProfileMutation(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      username: 'xinmengqaq',
      name: '新梦梦',
    })

    expect(useAuthStore.getState().token).toBe('old-token')
    expect(useAuthStore.getState().currentUser).toMatchObject({
      username: 'xinmengqaq',
      name: '新梦梦',
      avatar: '/files/new.png',
    })
  })

  it('修改密码成功后应清理登录态', async () => {
    useAuthStore.getState().setAuth('old-token', adminVO())
    vi.mocked(changeAdminPassword).mockResolvedValue(undefined)

    const { result } = renderHook(() => useChangeAdminPasswordMutation(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      oldPassword: 'old-pass',
      newPassword: 'new-pass',
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().currentUser).toBeNull()
  })

  it('校验 Token 成功后应返回有效结果', async () => {
    vi.mocked(validateAdminToken).mockResolvedValue({ valid: true })

    const { result } = renderHook(() => useValidateAdminTokenMutation(), {
      wrapper: createWrapper(),
    })

    await expect(result.current.mutateAsync()).resolves.toEqual({ valid: true })
  })

  it('刷新 Token 成功后应只更新 token 不改 currentUser', async () => {
    useAuthStore.getState().setAuth('old-token', adminVO())
    vi.mocked(refreshAdminToken).mockResolvedValue({ token: 'new-token' })

    const { result } = renderHook(() => useRefreshAdminTokenMutation(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync()

    expect(useAuthStore.getState().token).toBe('new-token')
    expect(useAuthStore.getState().currentUser).toEqual({
      id: 1,
      username: 'admin',
      name: '梦梦',
      role: 'admin',
      avatar: '/files/avatar.png',
    })
  })
})
