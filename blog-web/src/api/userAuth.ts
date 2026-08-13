import type {
  EmailCodeSendParams,
  UserCaptcha,
  UserLoginParams,
  UserLoginResponse,
  UserPasswordResetParams,
  UserRegistrationParams,
  UserRestoreParams,
} from '@/types/userAuth'
import { publicRequest } from '@/utils/request'
import { userRequest } from '@/utils/request'

export const loginUser = (params: UserLoginParams) =>
  publicRequest.post<UserLoginResponse>('/user/login', params)

export const restoreUserAccount = (params: UserRestoreParams) =>
  publicRequest.post<void>('/user/account/restore', params)

export const getUserCaptcha = () =>
  publicRequest.get<UserCaptcha>('/user/captcha')

export const sendRegistrationEmailCode = (params: EmailCodeSendParams) =>
  publicRequest.post<void>('/user/register/email-code', params)

export const registerUser = (params: UserRegistrationParams) =>
  publicRequest.post<void>('/user/register', params)

export const sendPasswordResetEmailCode = (params: EmailCodeSendParams) =>
  publicRequest.post<void>('/user/password/reset/email-code', params)

export const resetUserPassword = (params: UserPasswordResetParams) =>
  publicRequest.post<void>('/user/password/reset', params)

export const logoutUser = () => userRequest.post<void>('/user/logout')
