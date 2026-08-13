import type { CurrentUserProfile } from '@/types/userAuth'
import { userRequest } from '@/utils/request'

export const getUserProfile = () =>
  userRequest.get<CurrentUserProfile>('/user/profile')

export const updateUserProfile = (params: { nickname: string }) =>
  userRequest.put<CurrentUserProfile>('/user/profile', params)

export const sendUserEmailChangeCode = (params: {
  currentPassword: string
  newEmail: string
  captchaId: string
  captchaCode: string
}) => userRequest.post<{ message: string }>('/user/profile/email-code', params)

export const changeUserEmail = (params: {
  currentPassword: string
  newEmail: string
  emailCode: string
}) => userRequest.patch<CurrentUserProfile>('/user/profile/email', params)

export const changeUserPassword = (params: {
  currentPassword: string
  newPassword: string
}) => userRequest.patch<void>('/user/profile/password', params)

export const cancelUserAccount = () =>
  userRequest.post<{ deleteAt: string }>('/user/account/cancel')
