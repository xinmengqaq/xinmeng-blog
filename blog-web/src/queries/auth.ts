import { useMutation } from '@tanstack/react-query'

import { login, logout } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import type { AdminVO, CurrentUser, LoginParams } from '@/types/auth'

type LoginMutationResult = {
  token: string
  user: CurrentUser
}

export const toCurrentUser = (admin: AdminVO): CurrentUser => ({
  id: admin.id,
  username: admin.username,
  name: admin.name,
  role: admin.role,
  avatar: admin.avatar,
})

const loginWithCurrentUser = async (
  params: LoginParams,
): Promise<LoginMutationResult> => {
  const admin = await login(params)

  if (!admin.token) {
    throw { code: 'AUTH_TOKEN_MISSING', message: '登录响应缺少 Token' }
  }

  return { token: admin.token, user: toCurrentUser(admin) }
}

export const useLoginMutation = () => {
  const setAuth = useAuthStore((state) => state.setAuth)

  return useMutation({
    mutationFn: loginWithCurrentUser,
    onSuccess: (result) => setAuth(result.token, result.user),
  })
}

export const useLogoutMutation = () => {
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return useMutation({
    mutationFn: logout,
    onSettled: clearAuth,
  })
}
