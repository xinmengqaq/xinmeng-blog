import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { updateAdminProfile } from '@/api/admin'
import { removeAdminAvatar, uploadAdminAvatar } from '@/api/file'
import { useAuthStore } from '@/store/auth'
import type { AdminVO } from '@/types/auth'
import type { ImageDraft } from '@/types/file'

import { adminQueryKeys, useSaveAdminProfileWithAvatarMutation } from './admin'

vi.mock('@/api/admin', () => ({
  changeAdminPassword: vi.fn(),
  getAdminProfile: vi.fn(),
  refreshAdminToken: vi.fn(),
  updateAdminProfile: vi.fn(),
  validateAdminToken: vi.fn(),
}))

vi.mock('@/api/file', () => ({
  removeAdminAvatar: vi.fn(),
  uploadAdminAvatar: vi.fn(),
}))

const adminVO = (overrides: Partial<AdminVO> = {}): AdminVO => ({
  id: 1,
  username: 'admin',
  name: '梦梦',
  role: 'admin',
  avatar: '/files/original-avatar.jpg',
  ...overrides,
})

const createDraft = (): ImageDraft => ({
  id: 'avatar-draft',
  originalFile: new File(['source'], 'avatar.webp', { type: 'image/webp' }),
  previewUrl: 'blob:avatar-draft',
  type: 'static',
  uploadBlob: new Blob(['cropped'], { type: 'image/webp' }),
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return {
    queryClient,
    Wrapper({ children }: PropsWithChildren) {
      return createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      )
    },
  }
}

describe('管理员头像保存 Query', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  it('资料保存失败时不调用头像文件接口', async () => {
    // Given 管理员暂存了新头像且 Spring 资料保存失败
    // When 执行头像保存 mutation
    // Then 文件上传和移除接口均不会被调用
    const error = { code: 'PROFILE_FAILED', message: '资料保存失败' }
    vi.mocked(updateAdminProfile).mockRejectedValue(error)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSaveAdminProfileWithAvatarMutation(),
      { wrapper: Wrapper },
    )

    await expect(
      result.current.mutateAsync({
        avatarChange: { kind: 'upload', draft: createDraft() },
        profile: { name: '新梦梦', username: 'admin' },
      }),
    ).rejects.toEqual(error)

    expect(uploadAdminAvatar).not.toHaveBeenCalled()
    expect(removeAdminAvatar).not.toHaveBeenCalled()
  })

  it('资料成功后上传头像并以 file_url 同步查询缓存和登录态', async () => {
    // Given Spring 返回已保存的文字资料，FastAPI 返回确认的头像地址
    // When 执行上传头像保存 mutation
    // Then 请求顺序是资料后头像，资料缓存和 currentUser 使用确认地址
    const calls: string[] = []
    const savedProfile = adminVO({ name: '新梦梦' })
    const confirmedProfile = adminVO({
      avatar: '/files/confirmed-avatar.webp',
      name: '新梦梦',
    })
    vi.mocked(updateAdminProfile).mockImplementation(async () => {
      calls.push('profile-saved')
      return savedProfile
    })
    vi.mocked(uploadAdminAvatar).mockImplementation(async () => {
      calls.push('avatar-uploaded')
      return { file_url: confirmedProfile.avatar! }
    })
    useAuthStore.getState().setAuth('token-1', adminVO())
    const { queryClient, Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSaveAdminProfileWithAvatarMutation(),
      { wrapper: Wrapper },
    )

    await expect(
      result.current.mutateAsync({
        avatarChange: { kind: 'upload', draft: createDraft() },
        profile: { name: '新梦梦', username: 'admin' },
      }),
    ).resolves.toEqual({
      avatarStatus: 'saved',
      profile: confirmedProfile,
    })

    expect(calls).toEqual(['profile-saved', 'avatar-uploaded'])
    expect(updateAdminProfile).toHaveBeenCalledWith({
      name: '新梦梦',
      username: 'admin',
    })
    expect(queryClient.getQueryData(adminQueryKeys.profile)).toEqual(
      confirmedProfile,
    )
    expect(useAuthStore.getState().currentUser).toMatchObject({
      avatar: '/files/confirmed-avatar.webp',
      name: '新梦梦',
    })
  })

  it('资料成功后移除头像并以空头像同步查询缓存和登录态', async () => {
    // Given Spring 成功保存资料且管理员暂存了移除头像
    // When 执行头像移除保存 mutation
    // Then 资料请求先完成，随后无 body 删除头像并同步 null
    const calls: string[] = []
    const savedProfile = adminVO({ name: '新梦梦' })
    const confirmedProfile = { ...savedProfile, avatar: null }
    vi.mocked(updateAdminProfile).mockImplementation(async () => {
      calls.push('profile-saved')
      return savedProfile
    })
    vi.mocked(removeAdminAvatar).mockImplementation(async () => {
      calls.push('avatar-removed')
    })
    useAuthStore.getState().setAuth('token-1', adminVO())
    const { queryClient, Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSaveAdminProfileWithAvatarMutation(),
      { wrapper: Wrapper },
    )

    await expect(
      result.current.mutateAsync({
        avatarChange: { kind: 'remove' },
        profile: { name: '新梦梦', username: 'admin' },
      }),
    ).resolves.toEqual({
      avatarStatus: 'saved',
      profile: confirmedProfile,
    })

    expect(calls).toEqual(['profile-saved', 'avatar-removed'])
    expect(queryClient.getQueryData(adminQueryKeys.profile)).toEqual(
      confirmedProfile,
    )
    expect(useAuthStore.getState().currentUser?.avatar).toBeNull()
  })

  it('无头像变更时只保存资料', async () => {
    // Given 管理员没有暂存任何头像变更
    // When 执行头像保存 mutation
    // Then 只调用 Spring 资料接口，不调用 FastAPI 文件接口
    const savedProfile = adminVO({ name: '新梦梦' })
    vi.mocked(updateAdminProfile).mockResolvedValue(savedProfile)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSaveAdminProfileWithAvatarMutation(),
      { wrapper: Wrapper },
    )

    await expect(
      result.current.mutateAsync({
        avatarChange: null,
        profile: { name: '新梦梦', username: 'admin' },
      }),
    ).resolves.toEqual({
      avatarStatus: 'unchanged',
      profile: savedProfile,
    })

    expect(uploadAdminAvatar).not.toHaveBeenCalled()
    expect(removeAdminAvatar).not.toHaveBeenCalled()
  })

  it('头像请求失败时保留 Spring 成功结果并返回可展示的错误', async () => {
    // Given Spring 已保存文字资料，但 FastAPI 上传头像失败
    // When 执行头像保存 mutation
    // Then 返回部分成功结果，资料缓存保留 Spring 结果且头像可重试
    const savedProfile = adminVO({ name: '新梦梦' })
    const error = { code: 'UPLOAD_FAILED', message: '头像上传失败' }
    vi.mocked(updateAdminProfile).mockResolvedValue(savedProfile)
    vi.mocked(uploadAdminAvatar).mockRejectedValue(error)
    useAuthStore.getState().setAuth('token-1', adminVO())
    const { queryClient, Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSaveAdminProfileWithAvatarMutation(),
      { wrapper: Wrapper },
    )

    await expect(
      result.current.mutateAsync({
        avatarChange: { kind: 'upload', draft: createDraft() },
        profile: { name: '新梦梦', username: 'admin' },
      }),
    ).resolves.toEqual({
      avatarError: error,
      avatarStatus: 'failed',
      profile: savedProfile,
    })

    expect(queryClient.getQueryData(adminQueryKeys.profile)).toEqual(
      savedProfile,
    )
    expect(useAuthStore.getState().currentUser).toMatchObject({
      avatar: '/files/original-avatar.jpg',
      name: '新梦梦',
    })
  })

  it('头像请求返回 401 时不恢复已清理的登录态', async () => {
    // Given Spring 已保存资料，且 FastAPI 请求边界因 401 已清理登录态
    // When 头像保存用例处理该失败
    // Then 不回写管理员资料缓存或 currentUser，并继续交给登录页处理
    const savedProfile = adminVO({ name: '新梦梦' })
    const error = { code: '401', message: '登录已失效', status: 200 }
    vi.mocked(updateAdminProfile).mockResolvedValue(savedProfile)
    vi.mocked(uploadAdminAvatar).mockImplementation(async () => {
      useAuthStore.getState().clearAuth()
      throw error
    })
    useAuthStore.getState().setAuth('token-1', adminVO())
    const { queryClient, Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useSaveAdminProfileWithAvatarMutation(),
      { wrapper: Wrapper },
    )

    await expect(
      result.current.mutateAsync({
        avatarChange: { kind: 'upload', draft: createDraft() },
        profile: { name: '新梦梦', username: 'admin' },
      }),
    ).rejects.toEqual(error)

    expect(queryClient.getQueryData(adminQueryKeys.profile)).toBeUndefined()
    expect(useAuthStore.getState()).toMatchObject({
      currentUser: null,
      isAuthenticated: false,
      token: null,
    })
  })
})
