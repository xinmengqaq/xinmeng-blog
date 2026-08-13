import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { registerUser, sendRegistrationEmailCode } from '@/api/userAuth'
import type { EmailCodeSendParams, UserRegistrationParams } from '@/types/userAuth'
import { markRegisteredEmail } from '@/utils/userFirstLogin'

const RESEND_SECONDS = 60

export const useUserRegistrationFlow = () => {
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
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
    mutationFn: sendRegistrationEmailCode,
    onSuccess: (_, input) => {
      setEmail(input.email)
      setEmailCode('')
      setIsCodeSent(true)
      setResendSeconds(RESEND_SECONDS)
    },
    retry: false,
  })

  const register = useMutation({
    mutationFn: async (input: UserRegistrationParams) => {
      await registerUser(input)
      markRegisteredEmail(input.email)
      return { email: input.email }
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
    canResend: isCodeSent && resendSeconds === 0,
    changeEmail,
    email,
    emailCode,
    isCodeSent,
    register,
    requestNewCode,
    resendSeconds,
    sendCode,
    setEmailCode,
  }
}
