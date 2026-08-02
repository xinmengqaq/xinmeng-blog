import type { AdminCaptcha, AdminVO, LoginParams } from '@/types/auth'
import { request } from '@/utils/request'

export const getAdminCaptcha = () =>
  request.get<AdminCaptcha>('/admin/captcha')

export const login = (params: LoginParams) =>
  request.post<AdminVO>('/admin/login', params)

export const logout = () => request.post<void>('/admin/logout')
