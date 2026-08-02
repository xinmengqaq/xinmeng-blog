import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ImageDraft } from '@/types/file'

import {
  cleanupContentImage,
  removeAdminAvatar,
  removeArticleCover,
  removeSiteBackground,
  uploadAdminAvatar,
  uploadArticleCover,
  uploadContentImage,
  uploadSiteBackground,
} from './file'

const request = vi.hoisted(() => ({
  delete: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}))

vi.mock('@/utils/request', () => ({ request }))

const createDraft = (): ImageDraft => ({
  id: 'avatar-draft',
  originalFile: new File(['source'], 'avatar.webp', { type: 'image/webp' }),
  previewUrl: 'blob:avatar-draft',
  type: 'static',
  uploadBlob: new Blob(['cropped'], { type: 'image/webp' }),
})

describe('管理员头像文件 API', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('上传头像使用 FormData 的 file 字段和统一 /api 文件路径', async () => {
    // Given 管理员已在设置页暂存裁剪后的头像草稿
    // When 保存资料流程提交头像文件
    // Then 通过统一请求客户端向 /api/admin/files 下的头像路径发送 FormData
    const draft = createDraft()
    request.put.mockResolvedValue({ file_url: '/files/avatar.webp' })

    await expect(uploadAdminAvatar(draft)).resolves.toEqual({
      file_url: '/files/avatar.webp',
    })

    expect(request.put).toHaveBeenCalledTimes(1)
    const [url, formData] = request.put.mock.calls[0] as [string, FormData]
    const uploadedFile = formData.get('file')

    expect(url).toBe('/admin/files/profile/avatar')
    expect(uploadedFile).toBeInstanceOf(File)
    expect(uploadedFile).toMatchObject({
      name: 'avatar.webp',
      type: 'image/webp',
    })
  })

  it('移除头像使用统一 /api 文件路径且不带请求体', async () => {
    // Given 管理员已经确认在下次保存时移除头像
    // When 保存资料流程提交移除操作
    // Then 通过统一请求客户端调用 /api/admin/files 下的无 body 删除接口
    request.delete.mockResolvedValue(undefined)

    await expect(removeAdminAvatar()).resolves.toBeUndefined()

    expect(request.delete).toHaveBeenCalledWith('/admin/files/profile/avatar')
  })
})

describe('文章图片文件 API', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('正文图片上传使用 FastAPI 的 FormData file 字段', async () => {
    // Given 正文编辑器已经生成待保存图片草稿
    // When 文章保存编排上传正文图片
    // Then 请求 FastAPI 正文图片端点并读取 file_url
    const draft = createDraft()
    request.post.mockResolvedValue({ file_url: '/files/content.webp' })

    await expect(uploadContentImage(draft)).resolves.toEqual({
      file_url: '/files/content.webp',
    })

    const [url, formData] = request.post.mock.calls[0] as [string, FormData]
    expect(url).toBe('/admin/files/articles/content-images')
    expect(formData.get('file')).toBeInstanceOf(File)
  })

  it('封面上传和移除只使用真实文章 ID', async () => {
    // Given Spring 已经返回真实文章 ID
    // When 保存编排上传或移除文章封面
    // Then FastAPI 路径包含该文章 ID 且移除请求不带 body
    const draft = createDraft()
    request.put.mockResolvedValue({ file_url: '/files/cover.webp' })
    request.delete.mockResolvedValue(undefined)

    await uploadArticleCover(23, draft)
    await removeArticleCover(23)

    expect(request.put.mock.calls[0]?.[0]).toBe(
      '/admin/files/articles/23/cover',
    )
    expect(request.put.mock.calls[0]?.[1]).toBeInstanceOf(FormData)
    expect(request.delete).toHaveBeenCalledWith(
      '/admin/files/articles/23/cover',
    )
  })

  it('正文图片清理使用 JSON file_url 并保留 FastAPI 结果枚举', async () => {
    // Given Spring 已保存不含目标图片的新正文
    // When 保存编排请求 FastAPI 安全清理正文图片
    // Then DELETE body 只包含 file_url 且 retained_in_use 原样返回
    request.delete.mockResolvedValue({ result: 'retained_in_use' })

    await expect(cleanupContentImage('/files/content.webp')).resolves.toEqual({
      result: 'retained_in_use',
    })
    expect(request.delete).toHaveBeenCalledWith(
      '/admin/files/articles/content-images',
      { data: { file_url: '/files/content.webp' } },
    )
  })
})

describe('站点背景文件 API', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('上传背景只调用 FastAPI 的 FormData file 接口', async () => {
    // Given 管理员已在站点设置页暂存裁剪后的背景草稿
    // When 点击保存站点设置并提交背景上传
    // Then 统一请求客户端向 FastAPI 背景 PUT 路径发送 FormData 的 file 字段
    const draft = createDraft()
    request.put.mockResolvedValue({ file_url: '/files/site/background.webp' })

    await expect(uploadSiteBackground(draft)).resolves.toEqual({
      file_url: '/files/site/background.webp',
    })

    const [url, formData] = request.put.mock.calls[0] as [string, FormData]
    expect(url).toBe('/admin/files/site-config/background')
    expect(formData.get('file')).toBeInstanceOf(File)
  })

  it('移除背景只调用 FastAPI 的无 body DELETE 接口', async () => {
    // Given 管理员已确认移除当前站点背景
    // When 点击保存站点设置并提交移除
    // Then 统一请求客户端调用 FastAPI 背景 DELETE 路径且不携带请求体
    request.delete.mockResolvedValue(undefined)

    await expect(removeSiteBackground()).resolves.toBeUndefined()

    expect(request.delete).toHaveBeenCalledWith(
      '/admin/files/site-config/background',
    )
  })
})
