import type { AdminCaptcha, AdminVO, LoginParams } from '@/types/auth'
import { adminRequest } from '@/utils/request'

export const getAdminCaptcha = () =>
  adminRequest.get<AdminCaptcha>('/admin/captcha')

export const login = (params: LoginParams) =>
  adminRequest.post<AdminVO>('/admin/login', params)

export const logout = () => adminRequest.post<void>('/admin/logout')
