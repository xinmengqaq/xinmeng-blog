import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminVO } from '@/types/auth'
import type { AdminAvatarChange, ImageDraft } from '@/types/file'

import { AdminProfileSection } from './admin-settings/AdminProfileSection'

const mocks = vi.hoisted(() => ({
  legacySave: vi.fn(),
  releaseDraft: vi.fn(),
  saveProfileWithAvatar: vi.fn(),
  saving: false,
}))

type MockAvatarEditorProps = {
  avatarChange?: AdminAvatarChange | null
  disabled: boolean
  onAvatarChange?: (change: AdminAvatarChange | null) => void
}

let draft: ImageDraft

vi.mock('@/queries/admin', () => ({
  useSaveAdminProfileWithAvatarMutation: () => ({
    isPending: mocks.saving,
    mutateAsync: mocks.saveProfileWithAvatar,
  }),
  useUpdateAdminProfileMutation: () => ({
    isPending: false,
    mutateAsync: mocks.legacySave,
  }),
}))

vi.mock('@/utils/imageDrafts', () => ({
  releaseImageDraft: mocks.releaseDraft,
}))

vi.mock('./admin-settings/AdminAvatarEditor', async () => {
  const { createElement } = await import('react')

  return {
    AdminAvatarEditor: ({
      avatarChange,
      disabled,
      onAvatarChange,
    }: MockAvatarEditorProps) =>
      createElement(
        'div',
        null,
        createElement(
          'button',
          {
            disabled,
            onClick: () => onAvatarChange?.({ kind: 'upload', draft }),
            type: 'button',
          },
          '暂存头像草稿',
        ),
        createElement(
          'button',
          {
            disabled,
            onClick: () => onAvatarChange?.({ kind: 'remove' }),
            type: 'button',
          },
          '暂存头像移除',
        ),
        createElement(
          'span',
          null,
          avatarChange ? '头像变更待保存' : '头像无变更',
        ),
      ),
  }
})

const profile: AdminVO = {
  id: 1,
  username: 'admin',
  name: '梦梦',
  role: 'admin',
  avatar: '/files/original-avatar.jpg',
}

const renderProfileSection = () =>
  render(createElement(AdminProfileSection, { profile }))

const submitProfile = (container: HTMLElement) => {
  const form = container.querySelector('form')

  if (!form) {
    throw new Error('未找到管理员资料表单')
  }

  fireEvent.submit(form)
}

describe('管理员头像保存', () => {
  beforeEach(() => {
    draft = {
      id: 'avatar-draft',
      originalFile: new File(['source'], 'avatar.webp', {
        type: 'image/webp',
      }),
      previewUrl: 'blob:avatar-draft',
      type: 'static',
      uploadBlob: new Blob(['cropped'], { type: 'image/webp' }),
    }
    mocks.legacySave.mockReset()
    mocks.releaseDraft.mockReset()
    mocks.saveProfileWithAvatar.mockReset()
    mocks.saving = false
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('资料请求失败时不提交头像文件并保留可重试状态', async () => {
    // Given 管理员修改了资料并暂存了新头像，且 Spring 资料请求失败
    // When 管理员点击保存资料
    // Then 不发送 FastAPI 头像文件请求，线上头像和头像草稿都保留并可再次保存
    mocks.saveProfileWithAvatar.mockRejectedValue({
      code: 'PROFILE_FAILED',
      message: '资料保存失败',
    })

    const { container } = renderProfileSection()
    fireEvent.click(screen.getByRole('button', { name: '暂存头像草稿' }))
    submitProfile(container)

    await waitFor(() =>
      expect(mocks.saveProfileWithAvatar).toHaveBeenCalledWith({
        avatarChange: { kind: 'upload', draft },
        profile: { name: '梦梦', username: 'admin' },
      }),
    )

    expect(mocks.legacySave).not.toHaveBeenCalled()
    expect(mocks.releaseDraft).not.toHaveBeenCalled()
    expect(await screen.findByText('资料保存失败')).toBeInTheDocument()
    expect(screen.getByText('头像变更待保存')).toBeInTheDocument()
  })

  it('资料成功后按顺序上传头像并同步后端确认值', async () => {
    // Given 管理员修改了资料并暂存了裁剪后的新头像
    // When 管理员点击保存资料且 Spring 资料请求成功
    // Then 先保存不含本地头像信息的资料，再上传头像，并以后端确认头像同步资料缓存和登录态
    mocks.saveProfileWithAvatar.mockResolvedValue({
      avatarStatus: 'saved',
      profile: { ...profile, avatar: '/files/confirmed-avatar.webp' },
    })

    const { container } = renderProfileSection()
    fireEvent.click(screen.getByRole('button', { name: '暂存头像草稿' }))
    submitProfile(container)

    await waitFor(() =>
      expect(mocks.saveProfileWithAvatar).toHaveBeenCalledWith({
        avatarChange: { kind: 'upload', draft },
        profile: { name: '梦梦', username: 'admin' },
      }),
    )

    await waitFor(() => expect(mocks.releaseDraft).toHaveBeenCalledWith(draft))
    expect(screen.getByText('头像无变更')).toBeInTheDocument()
    expect(screen.getByText('资料已保存')).toBeInTheDocument()
  })

  it('资料成功后按顺序移除头像并同步空头像', async () => {
    // Given 管理员确认移除当前头像并修改了资料
    // When 管理员点击保存资料且 Spring 资料请求成功
    // Then 先保存资料，再调用无请求体的头像移除接口，并以空头像同步资料缓存和登录态
    mocks.saveProfileWithAvatar.mockResolvedValue({
      avatarStatus: 'saved',
      profile: { ...profile, avatar: null },
    })

    const { container } = renderProfileSection()
    fireEvent.click(screen.getByRole('button', { name: '暂存头像移除' }))
    submitProfile(container)

    await waitFor(() =>
      expect(mocks.saveProfileWithAvatar).toHaveBeenCalledWith({
        avatarChange: { kind: 'remove' },
        profile: { name: '梦梦', username: 'admin' },
      }),
    )

    expect(mocks.releaseDraft).not.toHaveBeenCalled()
    expect(screen.getByText('资料已保存')).toBeInTheDocument()
  })

  it('无头像变更时不发送头像文件请求', async () => {
    // Given 管理员只修改资料，没有暂存上传或移除头像
    // When 管理员点击保存资料
    // Then 只发送 Spring 资料请求，不发送任何 FastAPI 头像请求
    mocks.saveProfileWithAvatar.mockResolvedValue({
      avatarStatus: 'unchanged',
      profile,
    })

    const { container } = renderProfileSection()
    submitProfile(container)

    await waitFor(() =>
      expect(mocks.saveProfileWithAvatar).toHaveBeenCalledWith({
        avatarChange: null,
        profile: { name: '梦梦', username: 'admin' },
      }),
    )

    expect(mocks.releaseDraft).not.toHaveBeenCalled()
  })

  it('头像请求失败时保留草稿并允许重试', async () => {
    // Given Spring 资料已保存成功，但头像上传或移除请求失败
    // When 页面收到头像请求的中文错误
    // Then 文字资料保持成功，头像草稿或移除标记保留，并提供再次保存入口
    mocks.saveProfileWithAvatar.mockResolvedValue({
      avatarError: { code: 'UPLOAD_FAILED', message: '头像上传失败' },
      avatarStatus: 'failed',
      profile,
    })

    const { container } = renderProfileSection()
    fireEvent.click(screen.getByRole('button', { name: '暂存头像草稿' }))
    submitProfile(container)

    expect(await screen.findByText('头像上传失败')).toBeInTheDocument()
    expect(screen.getByText('头像变更待保存')).toBeInTheDocument()
    expect(mocks.releaseDraft).not.toHaveBeenCalled()
  })

  it('保存状态防止重复提交并在成功后释放本地预览', () => {
    // Given 管理员正在保存暂存头像
    // When 保存进行中、成功或失败
    // Then 保存期间禁止重复提交，且仅在头像成功后释放本地对象 URL
    mocks.saving = true

    renderProfileSection()

    expect(screen.getByRole('button', { name: '保存资料' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '暂存头像草稿' })).toBeDisabled()
    expect(mocks.releaseDraft).not.toHaveBeenCalled()
  })
})
