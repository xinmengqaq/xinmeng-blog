import type {
  AdminVO,
  ChangeAdminPasswordParams,
  RefreshTokenResult,
  UpdateAdminProfileParams,
  ValidateTokenResult,
} from '@/types/auth'
import { adminRequest } from '@/utils/request'

export const getAdminProfile = () => adminRequest.get<AdminVO>('/admin/profile')

export const updateAdminProfile = (params: UpdateAdminProfileParams) =>
  adminRequest.put<AdminVO>('/admin/profile', params)

export const changeAdminPassword = (params: ChangeAdminPasswordParams) =>
  adminRequest.patch<void>('/admin/profile/password', params)

export const validateAdminToken = () =>
  adminRequest.get<ValidateTokenResult>('/admin/validate')

export const refreshAdminToken = () =>
  adminRequest.post<RefreshTokenResult>('/admin/refresh')
