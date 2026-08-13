import { useCallback, useEffect, useRef, useState } from 'react'

import { getUserCaptcha } from '@/api/userAuth'
import type { UserCaptcha } from '@/types/userAuth'
import { toApiError } from '@/utils/request'

export const useAccountCaptcha = () => {
  const [captcha, setCaptcha] = useState<UserCaptcha | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const requestVersion = useRef(0)

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    setCaptcha(null)
    setCode('')
    setError(null)
    setIsLoading(true)

    try {
      const next = await getUserCaptcha()
      if (version === requestVersion.current) setCaptcha(next)
    } catch (reason) {
      if (version === requestVersion.current) setError(toApiError(reason).message)
    } finally {
      if (version === requestVersion.current) setIsLoading(false)
    }
  }, [])

  const rejectImage = useCallback(() => {
    setCaptcha(null)
    setCode('')
    setError('验证码图片加载失败，请重新加载')
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    canSubmit: Boolean(captcha) && !isLoading,
    captcha,
    code,
    error,
    isLoading,
    rejectImage,
    refresh,
    replaceAfterSendFailure: refresh,
    setCode,
  }
}
