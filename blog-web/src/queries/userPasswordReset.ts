import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { resetUserPassword, sendPasswordResetEmailCode } from '@/api/userAuth'

const RESEND_SECONDS = 60

export const useUserPasswordResetFlow = (initialEmail = '') => {
  const [email, setEmail] = useState(initialEmail)
  const [emailCode, setEmailCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    if (resendSeconds === 0) return
    const timer = window.setInterval(
      () => setResendSeconds((current) => Math.max(0, current - 1)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [resendSeconds])

  const sendCode = useMutation({
    mutationFn: async (
      input: Parameters<typeof sendPasswordResetEmailCode>[0],
    ) => {
      await sendPasswordResetEmailCode(input)
      return { message: '如果邮箱已注册，验证码将发送至该邮箱' }
    },
    onSuccess: (_, input) => {
      setEmail(input.email)
      setEmailCode('')
      setIsCodeSent(true)
      setResendSeconds(RESEND_SECONDS)
    },
    retry: false,
  })

  const reset = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw {
          code: 'PASSWORD_MISMATCH',
          field: 'confirmPassword',
          message: '两次输入的密码不一致',
        }
      }

      await resetUserPassword({ email, emailCode, newPassword })
      return { email, message: '密码已重置，请登录', replace: true as const }
    },
    onSuccess: () => {
      setEmailCode('')
      setNewPassword('')
      setConfirmPassword('')
      setIsCodeSent(false)
    },
    retry: false,
  })

  const changeEmail = (nextEmail: string) => {
    if (nextEmail === email) return
    setEmail(nextEmail)
    setEmailCode('')
    setIsCodeSent(false)
    setResendSeconds(0)
  }

  const requestNewCode = () => {
    setEmailCode('')
    setIsCodeSent(false)
    setResendSeconds(0)
  }

  return {
    changeEmail,
    confirmPassword,
    email,
    emailCode,
    isCodeSent,
    newPassword,
    requestNewCode,
    resendSeconds,
    reset,
    sendCode,
    setConfirmPassword,
    setEmail,
    setEmailCode,
    setNewPassword,
  }
}
