import type { ImageDraft } from '@/types/file'
import { userRequest } from '@/utils/request'

export type UserAvatarUploadResult = { file_url: string }

const toAvatarFormData = (draft: ImageDraft) => {
  const formData = new FormData()
  formData.append('file', draft.uploadBlob, draft.originalFile.name)
  return formData
}

export const uploadUserAvatar = (draft: ImageDraft) =>
  userRequest.put<UserAvatarUploadResult>(
    '/user/files/profile/avatar',
    toAvatarFormData(draft),
  )

export const removeUserAvatar = () =>
  userRequest.delete<void>('/user/files/profile/avatar')
