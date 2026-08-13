import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getUserProfile } from '@/api/userProfile'
import { updateUserProfile } from '@/api/userProfile'
import { removeUserAvatar, uploadUserAvatar } from '@/api/userFile'
import { useAdminAuthStore } from '@/store/auth'
import { useUserAuthStore } from '@/store/userAuth'

import { useUserProfileQuery } from './userProfile'
import { useSaveUserProfileMutation } from './userProfile'
import type { ImageDraft } from '@/types/file'
import { releaseImageDraft } from '@/utils/imageDrafts'

vi.mock('@/api/userProfile', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}))
vi.mock('@/api/userFile', () => ({
  removeUserAvatar: vi.fn(),
  uploadUserAvatar: vi.fn(),
}))
vi.mock('@/utils/imageDrafts', () => ({ releaseImageDraft: vi.fn() }))

const draft: ImageDraft = {
  id: 'draft-1',
  originalFile: new File(['source'], 'avatar.webp', { type: 'image/webp' }),
  previewUrl: 'blob:avatar',
  type: 'static',
  uploadBlob: new Blob(['cropped'], { type: 'image/webp' }),
}

const createWrapper = () => {
  const queryClient = new QueryClient()
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('普通用户资料确认 Query', () => {
  it('昵称失败时不调用头像接口', async () => {
    // Given 用户同时修改昵称和头像
    vi.mocked(updateUserProfile).mockRejectedValue({ code: '400', message: '昵称错误' })
    const { result } = renderHook(() => useSaveUserProfileMutation(), { wrapper: createWrapper() })
    // When 昵称保存失败
    await expect(result.current.mutateAsync({
      avatarChange: { kind: 'upload', draft }, nickname: '新昵称',
    })).rejects.toMatchObject({ code: '400' })
    // Then 不发送头像请求并保留全部草稿
    expect(uploadUserAvatar).not.toHaveBeenCalled()
    expect(removeUserAvatar).not.toHaveBeenCalled()
    expect(releaseImageDraft).not.toHaveBeenCalled()
  })

  it('昵称成功后串行保存头像并同步确认资料', async () => {
    // Given 用户提交昵称和头像变更
    const stages: string[] = []
    const saved = { id: 2, email: 'user@example.com', nickname: '新昵称', avatar: null }
    vi.mocked(updateUserProfile).mockImplementation(async () => {
      stages.push('profile-saved')
      return saved
    })
    vi.mocked(uploadUserAvatar).mockImplementation(async () => {
      stages.push('avatar-saved')
      return { file_url: '/files/avatar.webp' }
    })
    useUserAuthStore.getState().setToken('user-token')
    const Wrapper = createWrapper()
    const { result } = renderHook(() => useSaveUserProfileMutation(), { wrapper: Wrapper })
    // When 昵称保存成功
    await expect(result.current.mutateAsync({
      avatarChange: { kind: 'upload', draft }, nickname: '新昵称',
    })).resolves.toMatchObject({ avatarStatus: 'saved', profile: { avatar: '/files/avatar.webp' } })
    // Then 再保存头像并同步 Query、Store 和导航资料
    expect(stages).toEqual(['profile-saved', 'avatar-saved'])
    expect(useUserAuthStore.getState().currentUser?.avatar).toBe('/files/avatar.webp')
    expect(releaseImageDraft).toHaveBeenCalledWith(draft)
  })

  it('头像非鉴权失败返回部分成功且鉴权失败继续抛出', async () => {
    // Given 昵称已成功但头像保存失败
    const saved = { id: 2, email: 'user@example.com', nickname: '新昵称', avatar: '/old.webp' }
    vi.mocked(updateUserProfile).mockResolvedValue(saved)
    vi.mocked(uploadUserAvatar).mockRejectedValue({ code: 'UPLOAD_FAILED', message: '上传失败' })
    useUserAuthStore.getState().setToken('user-token')
    const { result } = renderHook(() => useSaveUserProfileMutation(), { wrapper: createWrapper() })
    // When 失败为普通错误或登录失效
    await expect(result.current.mutateAsync({
      avatarChange: { kind: 'upload', draft }, nickname: '新昵称',
    })).resolves.toMatchObject({ avatarStatus: 'failed', profile: saved })
    // Then 普通错误返回部分成功并保留头像草稿
    expect(releaseImageDraft).not.toHaveBeenCalled()
    // Then 登录失效继续抛出且不恢复已清理身份
    vi.mocked(uploadUserAvatar).mockImplementationOnce(async () => {
      useUserAuthStore.getState().clearAuth()
      throw { code: '401', message: '登录已失效', status: 401 }
    })
    await expect(result.current.mutateAsync({
      avatarChange: { kind: 'upload', draft }, nickname: '新昵称',
    })).rejects.toMatchObject({ code: '401' })
    expect(useUserAuthStore.getState().isAuthenticated).toBe(false)
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAdminAuthStore.getState().clearAuth()
    useUserAuthStore.getState().clearAuth()
  })

  it('本地凭证不能直接放行资料且资料请求不自动重试', async () => {
    // Given 本地存在普通用户凭证
    useUserAuthStore.getState().setAuth('user-token', {
      id: 2,
      email: 'user@example.com',
      nickname: '旧资料',
      avatar: null,
    })
    vi.mocked(getUserProfile).mockRejectedValue({
      code: 'NETWORK_ERROR',
      message: '网络错误',
    })
    // When 个人资料守卫开始确认当前用户资料
    const { result } = renderHook(() => useUserProfileQuery(), {
      wrapper: createWrapper(),
    })
    // Then Query 请求服务端资料并保持加载状态契约
    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.isError).toBe(true))
    // Then 请求失败不会自动重放
    expect(getUserProfile).toHaveBeenCalledTimes(1)
  })

  it('资料确认成功后同步普通用户资料', async () => {
    // Given 服务端返回当前普通用户资料
    const profile = {
      id: 2,
      email: 'user@example.com',
      nickname: '确认资料',
      avatar: '/files/avatar.webp',
    }
    vi.mocked(getUserProfile).mockResolvedValue(profile)
    useUserAuthStore.getState().setToken('user-token')
    // When 资料确认 Query 成功
    const { result } = renderHook(() => useUserProfileQuery(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Then Query 返回确认资料并同步普通用户 Store
    await waitFor(() =>
      expect(useUserAuthStore.getState().currentUser).toEqual(profile),
    )
  })

  it('资料确认失效后只清理普通用户并形成登录导航结果', async () => {
    // Given 管理员和普通用户同时登录且资料接口返回未登录
    useAdminAuthStore.getState().setAuth('admin-token', {
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'admin',
    })
    useUserAuthStore.getState().setAuth('user-token', {
      id: 2,
      email: 'user@example.com',
      nickname: '用户',
      avatar: null,
    })
    vi.mocked(getUserProfile).mockImplementation(async () => {
      useUserAuthStore.getState().clearAuth()
      throw { code: '401', message: '登录已失效', status: 401 }
    })
    // When 资料确认 Query 处理失效结果
    const { result } = renderHook(() => useUserProfileQuery(), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    // Then 只清理普通用户状态并记录有效返回目标和登录提示
    expect(useUserAuthStore.getState().isAuthenticated).toBe(false)
    // Then 管理员状态保持不变且失败请求不会重放
    expect(useAdminAuthStore.getState().token).toBe('admin-token')
    expect(getUserProfile).toHaveBeenCalledTimes(1)
  })
})
