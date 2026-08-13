export type ImageUploadTarget = 'avatar' | 'cover' | 'background' | 'content'

type CropTargetConfig = {
  title: string
  aspect: number
  cropShape: 'rect' | 'round'
}

export const CROP_TARGETS: Record<ImageUploadTarget, CropTargetConfig> = {
  avatar: { title: '裁剪头像', aspect: 1, cropShape: 'round' },
  cover: { title: '裁剪文章封面', aspect: 16 / 9, cropShape: 'rect' },
  background: { title: '裁剪站点背景', aspect: 12 / 5, cropShape: 'rect' },
  content: { title: '裁剪正文图片', aspect: 4 / 3, cropShape: 'rect' },
}

export const DEFAULT_CONTENT_ASPECT = 4 / 3
export const MIN_CONTENT_ASPECT = 0.25
export const MAX_CONTENT_ASPECT = 4

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const getOutputType = (fileType: string): string => {
  if (fileType === 'image/png' || fileType === 'image/webp') {
    return fileType
  }

  return 'image/jpeg'
}

export const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
