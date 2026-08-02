import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import {
  changeAdminPassword,
  getAdminProfile,
  refreshAdminToken,
  updateAdminProfile,
  validateAdminToken,
} from '@/api/admin'
import { removeAdminAvatar, uploadAdminAvatar } from '@/api/file'
import { useAuthStore } from '@/store/auth'
import type {
  AdminVO,
  ChangeAdminPasswordParams,
  RefreshTokenResult,
  UpdateAdminProfileParams,
  ValidateTokenResult,
} from '@/types/auth'
import type { AdminAvatarChange } from '@/types/file'
import { toApiError } from '@/utils/request'

import { toCurrentUser } from './auth'

export const adminQueryKeys = {
  profile: ['admin', 'profile'] as const,
}

export const useAdminProfileQuery = (options?: { enabled?: boolean }) => {
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser)

  const query = useQuery({
    queryKey: adminQueryKeys.profile,
    queryFn: () => getAdminProfile(),
    enabled: options?.enabled ?? true,
  })

  useEffect(() => {
    if (query.data) {
      setCurrentUser(toCurrentUser(query.data))
    }
  }, [query.data, setCurrentUser])

  return query
}

export const useUpdateAdminProfileMutation = () => {
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser)

  return useMutation<AdminVO, unknown, UpdateAdminProfileParams>({
    mutationFn: (params) => updateAdminProfile(params),
    onSuccess: (admin) => setCurrentUser(toCurrentUser(admin)),
  })
}

type SaveAdminProfileWithAvatarParams = {
  profile: UpdateAdminProfileParams
  avatarChange: AdminAvatarChange | null
}

type SaveAdminProfileWithAvatarResult = {
  profile: AdminVO
  avatarStatus: 'unchanged' | 'saved' | 'failed'
  avatarError?: ReturnType<typeof toApiError>
}

export const useSaveAdminProfileWithAvatarMutation = () => {
  const queryClient = useQueryClient()
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser)

  return useMutation<
    SaveAdminProfileWithAvatarResult,
    unknown,
    SaveAdminProfileWithAvatarParams
  >({
    mutationFn: async ({ profile, avatarChange }) => {
      const savedProfile = await updateAdminProfile(profile)
      console.info('profile-saved')

      if (!avatarChange) {
        return { profile: savedProfile, avatarStatus: 'unchanged' }
      }

      try {
        if (avatarChange.kind === 'upload') {
          const { file_url } = await uploadAdminAvatar(avatarChange.draft)
          console.info('avatar-uploaded')

          return {
            profile: { ...savedProfile, avatar: file_url },
            avatarStatus: 'saved',
          }
        }

        await removeAdminAvatar()
        console.info('avatar-removed')

        return {
          profile: { ...savedProfile, avatar: null },
          avatarStatus: 'saved',
        }
      } catch (error) {
        const avatarError = toApiError(error)
        console.info('avatar-failed')

        if (avatarError.code === '401' || avatarError.status === 401) {
          throw avatarError
        }

        return {
          profile: savedProfile,
          avatarError,
          avatarStatus: 'failed',
        }
      }
    },
    onSuccess: ({ profile }) => {
      queryClient.setQueryData(adminQueryKeys.profile, profile)
      setCurrentUser(toCurrentUser(profile))
    },
  })
}

export const useChangeAdminPasswordMutation = () => {
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return useMutation<void, unknown, ChangeAdminPasswordParams>({
    mutationFn: (params) => changeAdminPassword(params),
    onSuccess: clearAuth,
  })
}

export const useValidateAdminTokenMutation = () =>
  useMutation<ValidateTokenResult, unknown, void>({
    mutationFn: () => validateAdminToken(),
  })

export const useRefreshAdminTokenMutation = () => {
  const setToken = useAuthStore((state) => state.setToken)

  return useMutation<RefreshTokenResult, unknown, void>({
    mutationFn: () => refreshAdminToken(),
    onSuccess: (result) => setToken(result.token),
  })
}
