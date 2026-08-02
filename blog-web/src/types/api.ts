export type ApiResult<T> = {
  code: string
  msg?: string
  message?: string
  data: T
}

export type PageResult<T> = {
  page: number
  size: number
  total: number
  pages: number
  list: T[]
}

export type ApiError = {
  code: string
  message: string
  status?: number
  details?: unknown
}
