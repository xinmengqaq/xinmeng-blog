import type {
  AdminVO,
  ChangeAdminPasswordParams,
  RefreshTokenResult,
  UpdateAdminProfileParams,
  ValidateTokenResult,
} from '@/types/auth'
import { request } from '@/utils/request'

export const getAdminProfile = () => request.get<AdminVO>('/admin/profile')

export const updateAdminProfile = (params: UpdateAdminProfileParams) =>
  request.put<AdminVO>('/admin/profile', params)

export const changeAdminPassword = (params: ChangeAdminPasswordParams) =>
  request.patch<void>('/admin/profile/password', params)

export const validateAdminToken = () =>
  request.get<ValidateTokenResult>('/admin/validate')

export const refreshAdminToken = () =>
  request.post<RefreshTokenResult>('/admin/refresh')
