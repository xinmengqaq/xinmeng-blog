import type { ApiError } from '@/types/api'
import type { ArticleLikeRateLimitDetails } from '@/types/publicContent'

export const getLikeErrorMessage = (error: unknown) => {
  const apiError = error as ApiError
  if (apiError?.code === '409') return '这篇文章已经收到过你的喜欢了'
  if (apiError?.code === '429') {
    const seconds = (
      apiError.details as ArticleLikeRateLimitDetails | undefined
    )?.retryAfterSeconds
    return seconds
      ? `点赞太频繁，请在 ${seconds} 秒后再试`
      : '点赞太频繁，请稍后再试'
  }
  return apiError?.message || '点赞失败，请稍后重试'
}

export const getScrollBehavior = (reducedMotion: boolean): ScrollBehavior =>
  reducedMotion ? 'auto' : 'smooth'
