import type { ImageDraft } from '@/types/file'
import { request } from '@/utils/request'

export type AdminAvatarUploadResult = {
  file_url: string
}

export type FileUploadResult = {
  file_url: string
}

export type ContentImageCleanupResult =
  'deleted' | 'already_absent' | 'retained_in_use' | 'external_ignored'

export type ContentImageCleanupResponse = {
  result: ContentImageCleanupResult
}

const toImageFormData = (draft: ImageDraft) => {
  const formData = new FormData()
  formData.append('file', draft.uploadBlob, draft.originalFile.name)
  return formData
}

export const uploadAdminAvatar = (draft: ImageDraft) => {
  return request.put<AdminAvatarUploadResult>(
    '/admin/files/profile/avatar',
    toImageFormData(draft),
  )
}

export const removeAdminAvatar = () =>
  request.delete<void>('/admin/files/profile/avatar')

export const uploadContentImage = (draft: ImageDraft) =>
  request.post<FileUploadResult>(
    '/admin/files/articles/content-images',
    toImageFormData(draft),
  )

export const cleanupContentImage = (fileUrl: string) =>
  request.delete<ContentImageCleanupResponse>(
    '/admin/files/articles/content-images',
    { data: { file_url: fileUrl } },
  )

export const uploadArticleCover = (articleId: number, draft: ImageDraft) =>
  request.put<FileUploadResult>(
    `/admin/files/articles/${articleId}/cover`,
    toImageFormData(draft),
  )

export const removeArticleCover = (articleId: number) =>
  request.delete<void>(`/admin/files/articles/${articleId}/cover`)

export const uploadSiteBackground = (draft: ImageDraft) =>
  request.put<FileUploadResult>(
    '/admin/files/site-config/background',
    toImageFormData(draft),
  )

export const removeSiteBackground = () =>
  request.delete<void>('/admin/files/site-config/background')
