import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { removeUserAvatar, uploadUserAvatar } from '@/api/userFile'
import { getUserProfile, updateUserProfile } from '@/api/userProfile'
import { useUserAuthStore } from '@/store/userAuth'
import type { UserAvatarChange } from '@/types/file'
import { releaseImageDraft } from '@/utils/imageDrafts'
import { isApiError, toApiError } from '@/utils/request'

export const userProfileQueryKey = ['user', 'profile'] as const

export const useUserProfileQuery = () => {
  const token = useUserAuthStore((state) => state.token)

  return useQuery({
    queryKey: userProfileQueryKey,
    queryFn: async () => {
      const profile = await getUserProfile()
      useUserAuthStore.getState().setCurrentUser(profile)
      return profile
    },
    enabled: Boolean(token),
    retry: false,
  })
}

type SaveUserProfileInput = {
  nickname: string
  avatarChange: UserAvatarChange | null
}

export const useSaveUserProfileMutation = () => {
  const queryClient = useQueryClient()

  const syncProfile = (profile: Awaited<ReturnType<typeof updateUserProfile>>) => {
    queryClient.setQueryData(userProfileQueryKey, profile)
    useUserAuthStore.getState().setCurrentUser(profile)
  }

  return useMutation({
    mutationFn: async ({ nickname, avatarChange }: SaveUserProfileInput) => {
      const savedProfile = await updateUserProfile({ nickname })

      if (!avatarChange) {
        syncProfile(savedProfile)
        return { avatarStatus: 'unchanged' as const, profile: savedProfile }
      }

      try {
        const avatar =
          avatarChange.kind === 'upload'
            ? (await uploadUserAvatar(avatarChange.draft)).file_url
            : (await removeUserAvatar(), null)
        const profile = { ...savedProfile, avatar }
        syncProfile(profile)
        if (avatarChange.kind === 'upload') releaseImageDraft(avatarChange.draft)
        return { avatarStatus: 'saved' as const, profile }
      } catch (error) {
        const apiError = toApiError(error)
        if (isApiError(apiError) && (apiError.code === '401' || apiError.status === 401)) {
          throw apiError
        }

        syncProfile(savedProfile)
        return {
          avatarError: apiError,
          avatarStatus: 'failed' as const,
          profile: savedProfile,
        }
      }
    },
    retry: false,
  })
}
