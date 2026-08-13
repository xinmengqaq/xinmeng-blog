import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

import { useAdminAuthStore } from '@/store/auth'
import { useUserAuthStore } from '@/store/userAuth'
import type { ApiError, ApiResult } from '@/types/api'

const apiBase = import.meta.env.VITE_API_BASE || '/api'
const successCodes = new Set(['0', '200', 'SUCCESS'])

const isSuccessCode = (code: string) => successCodes.has(code.toUpperCase())

export const isApiError = (error: unknown): error is ApiError =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  'message' in error

export const toApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const response = error.response
    if (response) {
      const result = response.data
      if (typeof result === 'object' && result !== null) {
        const payload = result as Record<string, unknown>
        if (typeof payload.code === 'string') {
          return {
            code: payload.code,
            message:
              typeof payload.message === 'string'
                ? payload.message
                : typeof payload.msg === 'string'
                  ? payload.msg
                  : '请求失败，请稍后重试',
            status: response.status,
            details: payload.data,
          }
        }
      }

      return {
        code: String(response.status),
        message:
          response.status === 401
            ? '登录已失效，请重新登录'
            : '请求失败，请稍后重试',
        status: response.status,
      }
    }

    return {
      code: 'NETWORK_ERROR',
      message: '无法连接后端服务，请确认服务是否已启动',
    }
  }

  if (isApiError(error)) return error

  return { code: 'UNKNOWN_ERROR', message: '请求失败，请稍后重试' }
}

type RequestIdentity = {
  getToken?: () => string | null
  clearAuth?: () => void
}

const createRequest = ({ getToken, clearAuth }: RequestIdentity = {}) => {
  const client = axios.create({ baseURL: apiBase, timeout: 10000 })

  if (getToken) {
    client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = getToken()
      if (token) config.headers.set('Authorization', `Bearer ${token}`)
      return config
    })
  }

  const rejectApiError = (error: unknown) => {
    const apiError = toApiError(error)
    if (apiError.code === '401' || apiError.status === 401) clearAuth?.()
    return Promise.reject(apiError)
  }

  client.interceptors.response.use(
    (response: AxiosResponse<ApiResult<unknown>>) => {
      const result = response.data
      if (result && typeof result.code === 'string' && isSuccessCode(result.code)) {
        return result.data as never
      }

      return rejectApiError({
        code: result?.code || String(response.status),
        message: result?.message || result?.msg || '请求失败，请稍后重试',
        status: response.status,
        details: result?.data,
      })
    },
    rejectApiError,
  )

  return { client, request: toRequestMethods(client) }
}

const toRequestMethods = (client: AxiosInstance) => ({
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return client.get<unknown, T>(url, config)
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return client.post<unknown, T>(url, data, config)
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return client.put<unknown, T>(url, data, config)
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return client.patch<unknown, T>(url, data, config)
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return client.delete<unknown, T>(url, config)
  },
})

const publicClient = createRequest()
const adminClient = createRequest({
  getToken: () => useAdminAuthStore.getState().token,
  clearAuth: () => useAdminAuthStore.getState().clearAuth(),
})
const userClient = createRequest({
  getToken: () => useUserAuthStore.getState().token,
  clearAuth: () => useUserAuthStore.getState().clearAuth(),
})

export const publicApiClient = publicClient.client
export const publicRequest = publicClient.request
export const adminApiClient = adminClient.client
export const adminRequest = adminClient.request
export const userApiClient = userClient.client
export const userRequest = userClient.request
