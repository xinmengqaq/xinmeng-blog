import { useMutation } from '@tanstack/react-query'

import {
  cancelUserAccount,
  changeUserEmail,
  changeUserPassword,
  sendUserEmailChangeCode,
} from '@/api/userProfile'
import { useUserAuthStore } from '@/store/userAuth'

export const useUserAccountSecurity = () => {
  const clearAuth = useUserAuthStore((state) => state.clearAuth)
  const currentEmail = useUserAuthStore((state) => state.currentUser?.email)

  const sendEmailCode = useMutation({
    mutationFn: async (input: Parameters<typeof sendUserEmailChangeCode>[0]) => {
      await sendUserEmailChangeCode(input)
      return { message: '验证码已发送' }
    },
    retry: false,
  })

  const changeEmailMutation = useMutation({
    mutationFn: async (input: Parameters<typeof changeUserEmail>[0]) => {
      const profile = await changeUserEmail(input)
      return { email: profile.email, message: '邮箱修改成功，请重新登录', replace: true as const }
    },
    onSuccess: clearAuth,
    retry: false,
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (input: Parameters<typeof changeUserPassword>[0] & { confirmPassword: string }) => {
      if (input.newPassword !== input.confirmPassword) {
        throw { code: 'PASSWORD_MISMATCH', message: '两次输入的密码不一致' }
      }
      await changeUserPassword({ currentPassword: input.currentPassword, newPassword: input.newPassword })
    },
    onSuccess: clearAuth,
    retry: false,
  })

  const cancelAccount = useMutation({
    mutationFn: async ({ confirmEmail }: { confirmEmail: string }) => {
      if (!currentEmail || confirmEmail.trim().toLowerCase() !== currentEmail.trim().toLowerCase()) {
        throw { code: 'EMAIL_MISMATCH', message: '邮箱不匹配' }
      }
      return cancelUserAccount()
    },
    onSuccess: clearAuth,
    retry: false,
  })

  return {
    cancelAccount,
    changeEmail: changeEmailMutation,
    changePassword: changePasswordMutation,
    sendEmailCode,
  }
}
