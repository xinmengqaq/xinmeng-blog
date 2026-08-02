import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createImageDraft,
  getImageDraftUrl,
  releaseAllImageDrafts,
  releaseImageDraft,
} from './imageDrafts'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Task 7 BDD-002: 裁剪和确认只产生页面内草稿', () => {
  it('静态图裁剪只产生页面内草稿', () => {
    // 假如 管理员应用裁剪或确认 GIF
    // 当 尚未点击页面保存
    // 那么 页面只显示本地待保存预览
    // 并且 两个后端都没有收到文件请求
    const originalFile = new File(['original'], 'test.jpg', {
      type: 'image/jpeg',
    })
    const croppedBlob = new Blob(['cropped'], { type: 'image/jpeg' })
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:cropped-preview')

    const draft = createImageDraft(originalFile, croppedBlob)

    expect(draft.originalFile).toBe(originalFile)
    expect(draft.uploadBlob).toBe(croppedBlob)
    expect(draft.previewUrl).toBe('blob:cropped-preview')
    expect(draft.type).toBe('static')
    expect(getImageDraftUrl(draft)).toBe(draft.previewUrl)
    expect(createObjectUrl).toHaveBeenCalledWith(croppedBlob)
  })

  it('GIF 保留原文件作为待上传内容', () => {
    // 假如 管理员确认正文 GIF
    // 当 尚未点击页面保存
    // 那么 GIF 原动画数据作为待上传内容保留
    const gifFile = new File(['gif'], 'test.gif', { type: 'image/gif' })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:gif-preview')

    const draft = createImageDraft(gifFile)

    expect(draft.type).toBe('gif')
    expect(draft.uploadBlob).toBe(gifFile)
  })

  it('撤销与批量释放只撤销已注册的对象 URL', () => {
    // 假如 页面存在待保存图片草稿
    // 当 管理员撤销或页面统一释放草稿
    // 那么 每个对象 URL 只释放一次
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:first-preview')
      .mockReturnValueOnce('blob:second-preview')
    const revokeObjectUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    const firstDraft = createImageDraft(
      new File([], 'first.jpg', { type: 'image/jpeg' }),
    )
    const secondDraft = createImageDraft(
      new File([], 'second.jpg', { type: 'image/jpeg' }),
    )

    releaseImageDraft(firstDraft)
    releaseImageDraft(firstDraft)
    releaseAllImageDrafts([firstDraft, secondDraft])

    expect(revokeObjectUrl).toHaveBeenCalledTimes(2)
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:first-preview')
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:second-preview')
  })
})
