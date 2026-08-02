import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ImageDraft, SiteBackgroundChange } from '@/types/file'

import { SiteBackgroundEditor } from './SiteBackgroundEditor'

const mocks = vi.hoisted(() => ({
  change: null as SiteBackgroundChange | null,
  discardChanges: vi.fn(),
  isSaving: false,
  mutateAsync: vi.fn(),
}))

vi.mock('@/queries/siteConfig', () => ({
  useSaveSiteBackgroundMutation: () => ({
    isPending: mocks.isSaving,
    mutateAsync: mocks.mutateAsync,
  }),
}))

vi.mock('./useSiteBackgroundDraft', () => ({
  useSiteBackgroundDraft: () => ({
    applyCrop: vi.fn(),
    cancelLeave: vi.fn(),
    change: mocks.change,
    closeCropDialog: vi.fn(),
    closeRemoveDialog: vi.fn(),
    confirmLeave: vi.fn(),
    confirmRemove: vi.fn(),
    cropFile: null,
    discardChanges: mocks.discardChanges,
    fileError: null,
    handleFileChange: vi.fn(),
    hasPendingChanges: Boolean(mocks.change),
    leaveDialogOpen: false,
    openRemoveDialog: vi.fn(),
    removeDialogOpen: false,
  }),
}))

const createDraft = (): ImageDraft => ({
  id: 'background-draft',
  originalFile: new File(['source'], 'background.webp', {
    type: 'image/webp',
  }),
  previewUrl: 'blob:background-draft',
  type: 'static',
  uploadBlob: new Blob(['cropped'], { type: 'image/webp' }),
})

const renderEditor = () =>
  render(
    createElement(SiteBackgroundEditor, {
      currentBackground: '/files/current-background.webp',
      isLoading: false,
    }),
  )

describe('站点背景保存', () => {
  afterEach(() => {
    mocks.change = null
    mocks.discardChanges.mockReset()
    mocks.isSaving = false
    mocks.mutateAsync.mockReset()
  })

  it('裁剪或确认移除后未保存时不发送背景文件请求', () => {
    // Given 管理员已应用背景裁剪或确认移除背景，公开背景仍为后端当前值
    // When 管理员尚未点击保存站点设置
    // Then 不发送背景上传或移除请求，公开背景保持原值且页面保留待保存状态
    mocks.change = { kind: 'remove' }

    renderEditor()

    expect(mocks.mutateAsync).not.toHaveBeenCalled()
    expect(screen.getByText('背景将在保存站点设置时移除')).toBeInTheDocument()
  })

  it('上传背景保存成功后使用后端确认地址刷新公开缓存', () => {
    // Given 管理员暂存了裁剪后的站点背景
    // When 管理员点击保存站点设置且背景上传成功
    // Then 以 FormData 的 file 提交上传，公开背景缓存刷新为后端确认地址并清除本地草稿
    mocks.change = { kind: 'upload', draft: createDraft() }
    mocks.mutateAsync.mockResolvedValue({
      backgroundUrl: '/files/confirmed-background.webp',
    })

    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: '保存站点设置' }))

    expect(mocks.mutateAsync).toHaveBeenCalledWith(mocks.change)
    return waitFor(() => expect(mocks.discardChanges).toHaveBeenCalledTimes(1))
  })

  it('移除背景保存成功后将公开缓存刷新为空值', () => {
    // Given 管理员已确认移除当前站点背景
    // When 管理员点击保存站点设置且背景移除成功
    // Then 以无请求体的删除请求提交，并将公开背景缓存刷新为 null
    mocks.change = { kind: 'remove' }
    mocks.mutateAsync.mockResolvedValue({ backgroundUrl: null })

    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: '保存站点设置' }))

    expect(mocks.mutateAsync).toHaveBeenCalledWith({ kind: 'remove' })
    return waitFor(() => expect(mocks.discardChanges).toHaveBeenCalledTimes(1))
  })

  it('上传失败时保留本地草稿并允许重试', () => {
    // Given 管理员暂存了裁剪后的站点背景且当前线上背景可见
    // When 背景上传返回中文错误
    // Then 页面保留本地预览和待保存状态，不把本地预览当作线上背景，并允许再次保存
    mocks.change = { kind: 'upload', draft: createDraft() }
    mocks.mutateAsync.mockRejectedValue({
      code: 'BACKGROUND_SAVE_FAILED',
      message: '背景保存失败',
    })

    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: '保存站点设置' }))

    return waitFor(() => {
      expect(screen.getByText('背景保存失败')).toBeInTheDocument()
      expect(mocks.discardChanges).not.toHaveBeenCalled()
      expect(screen.getByText('新背景待保存')).toBeInTheDocument()
    })
  })

  it('移除失败时保留移除标记且重试不重复删除已不存在背景', async () => {
    // Given 管理员暂存了移除站点背景的变更
    // When 背景移除失败后管理员再次点击保存
    // Then 页面保留移除标记并按后端幂等结果完成重试，不把失败伪装为已移除
    mocks.change = { kind: 'remove' }
    mocks.mutateAsync
      .mockRejectedValueOnce({
        code: 'BACKGROUND_REMOVE_FAILED',
        message: '背景移除失败',
      })
      .mockResolvedValueOnce({ backgroundUrl: null })

    renderEditor()
    const saveButton = screen.getByRole('button', { name: '保存站点设置' })
    fireEvent.click(saveButton)

    await screen.findByText('背景移除失败')
    expect(screen.getByText('背景将在保存站点设置时移除')).toBeInTheDocument()

    fireEvent.click(saveButton)
    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledTimes(2)
    })
  })

  it('保存中禁用背景编辑并仅在成功后释放本地预览', () => {
    // Given 管理员正在保存待上传或待移除的站点背景
    // When 保存处于进行中、成功或失败状态
    // Then 保存期间禁用保存和背景操作，且只在成功后释放本地对象 URL
    mocks.change = { kind: 'upload', draft: createDraft() }
    mocks.isSaving = true

    renderEditor()

    expect(screen.getByRole('button', { name: '保存站点设置' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '更换背景' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '移除背景' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '撤销变更' })).toBeDisabled()
    expect(mocks.discardChanges).not.toHaveBeenCalled()
  })
})
