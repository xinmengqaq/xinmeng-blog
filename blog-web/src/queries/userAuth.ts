import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { loginUser, logoutUser, restoreUserAccount } from '@/api/userAuth'
import { getUserLoginSuccessTarget } from '@/router/guardUtils'
import { useUserAuthStore } from '@/store/userAuth'
import type { UserLoginParams, UserRestoreParams } from '@/types/userAuth'
import { isApiError } from '@/utils/request'
import { consumeRegisteredEmail } from '@/utils/userFirstLogin'
import { getUserLogoutTarget } from '@/utils/userLogoutTarget'

type UserLoginInput = {
  credentials: UserLoginParams
  returnTo?: unknown
}

export const useUserLoginFlow = () => {
  const [recoveryCredentials, setRecoveryCredentials] =
    useState<UserRestoreParams | null>(null)

  const login = useMutation({
    mutationFn: async ({ credentials, returnTo }: UserLoginInput) => {
      try {
        const response = await loginUser(credentials)
        if (!response.token) {
          throw {
            code: 'AUTH_TOKEN_MISSING',
            message: '登录响应缺少 Token',
          }
        }

        const { token, ...profile } = response
        useUserAuthStore.getState().setAuth(token, profile)
        setRecoveryCredentials(null)
        return {
          redirectTo: consumeRegisteredEmail(profile.email)
            ? '/profile'
            : getUserLoginSuccessTarget(returnTo),
          profile,
        }
      } catch (error) {
        if (isApiError(error) && error.code === '409') {
          setRecoveryCredentials({
            email: credentials.email,
            password: credentials.password,
          })
        } else {
          setRecoveryCredentials(null)
        }
        throw error
      }
    },
    retry: false,
  })

  const restore = useMutation({
    mutationFn: async () => {
      if (!recoveryCredentials) {
        throw { code: 'RECOVERY_NOT_AVAILABLE', message: '没有可恢复的账号' }
      }

      const email = recoveryCredentials.email
      await restoreUserAccount(recoveryCredentials)
      return { email, message: '账号已恢复，请重新登录' }
    },
    onSuccess: () => {
      setRecoveryCredentials(null)
      login.reset()
    },
    retry: false,
  })

  return {
    cancelRecovery: () => {
      setRecoveryCredentials(null)
      login.reset()
      restore.reset()
    },
    login,
    recoveryEmail: recoveryCredentials?.email ?? null,
    restore,
  }
}

export const useUserLogoutMutation = () =>
  useMutation({
    mutationFn: async ({ pathname }: { pathname: string }) => {
      try {
        await logoutUser()
      } catch (error) {
        if (
          !isApiError(error) ||
          (error.code !== '401' && error.status !== 401)
        ) {
          throw error
        }
      }
      return getUserLogoutTarget(pathname)
    },
    onSuccess: () => useUserAuthStore.getState().clearAuth(),
    retry: false,
  })
