import axios, { type AxiosRequestConfig } from 'axios'

import type { ApiError, ApiResult } from '@/types/api'
import { useAuthStore } from '@/store/auth'

const apiBase = import.meta.env.VITE_API_BASE || '/api'

export const apiClient = axios.create({
  baseURL: apiBase,
  timeout: 10000,
})

const successCodes = new Set(['0', '200', 'SUCCESS'])

const isSuccessCode = (code: string) => successCodes.has(code.toUpperCase())

export const toApiError = (error: unknown): ApiError => {
  if (isApiError(error)) {
    return error
  }

  if (axios.isAxiosError(error)) {
    return {
      code: error.response?.status === 401 ? '401' : 'NETWORK_ERROR',
      message:
        error.response?.status === 401
          ? '登录已失效，请重新登录'
          : '无法连接后端服务，请确认服务是否已启动',
      status: error.response?.status,
    }
  }

  return { code: 'UNKNOWN_ERROR', message: '请求失败，请稍后重试' }
}

export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}

const requestInterceptor = (config: AxiosRequestConfig) => {
  const token = useAuthStore.getState().token

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
}

const processResponse = (response: any) => {
  const result = response.data as ApiResult<unknown>

  if (result && typeof result.code === 'string' && isSuccessCode(result.code)) {
    return result.data as never
  }

  const apiError: ApiError = {
    code: result?.code || String(response.status),
    message: result?.message || result?.msg || '请求失败，请稍后重试',
    status: response.status,
    details: result?.data,
  }

  if (apiError.code === '401' || response.status === 401) {
    useAuthStore.getState().clearAuth()
  }

  return Promise.reject(apiError)
}

const handleRejection = (error: unknown) => {
  const apiError = toApiError(error)

  if (apiError.code === '401' || apiError.status === 401) {
    useAuthStore.getState().clearAuth()
  }

  return Promise.reject(apiError)
}

apiClient.interceptors.request.use(requestInterceptor)

apiClient.interceptors.response.use(processResponse, handleRejection)

export const request = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.get<unknown, T>(url, config)
  },

  post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return apiClient.post<unknown, T>(url, data, config)
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.put<unknown, T>(url, data, config)
  },

  patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return apiClient.patch<unknown, T>(url, data, config)
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete<unknown, T>(url, config)
  },
}
