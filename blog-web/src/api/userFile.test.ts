import { afterEach, describe, expect, it, vi } from 'vitest'

import { userRequest } from '@/utils/request'
import type { ImageDraft } from '@/types/file'
import { removeUserAvatar, uploadUserAvatar } from './userFile'

vi.mock('@/utils/request', () => ({ userRequest: { delete: vi.fn(), put: vi.fn() } }))

const draft: ImageDraft = {
  id: 'draft-1',
  originalFile: new File(['source'], 'avatar.webp', { type: 'image/webp' }),
  previewUrl: 'blob:avatar',
  type: 'static',
  uploadBlob: new Blob(['cropped'], { type: 'image/webp' }),
}

describe('普通用户头像 API', () => {
  afterEach(() => vi.clearAllMocks())

  it('头像上传和移除使用真实用户文件接口', () => {
    // Given 用户选择上传或移除头像
    // When 调用头像文件 API
    uploadUserAvatar(draft)
    removeUserAvatar()
    // Then 上传使用 FormData file 字段且移除无请求体
    const [url, formData] = vi.mocked(userRequest.put).mock.calls[0] as [string, FormData]
    expect(url).toBe('/user/files/profile/avatar')
    expect(formData.get('file')).toBeInstanceOf(File)
    expect(userRequest.delete).toHaveBeenCalledWith('/user/files/profile/avatar')
  })
})
