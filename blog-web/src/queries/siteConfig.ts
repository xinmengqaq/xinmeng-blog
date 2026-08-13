import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { removeSiteBackground, uploadSiteBackground } from '@/api/file'
import { getPublicSiteBackground } from '@/api/siteConfig'
import type { PublicSiteBackground } from '@/types/siteConfig'
import type { SiteBackgroundChange } from '@/types/file'

export const siteConfigQueryKeys = {
  all: ['site-config'] as const,
  background: () => [...siteConfigQueryKeys.all, 'background'] as const,
}

export const usePublicSiteBackgroundQuery = () =>
  useQuery({
    queryKey: siteConfigQueryKeys.background(),
    queryFn: getPublicSiteBackground,
    staleTime: Infinity,
  })

const saveSiteBackground = async (
  change: SiteBackgroundChange,
): Promise<PublicSiteBackground> => {
  console.info('background-save-start')

  try {
    if (change.kind === 'upload') {
      const { file_url } = await uploadSiteBackground(change.draft)
      console.info('background-save-success')
      return { backgroundUrl: file_url }
    }

    await removeSiteBackground()
    console.info('background-save-success')
    return { backgroundUrl: null }
  } catch (error) {
    console.info('background-save-failure')
    throw error
  }
}

export const useSaveSiteBackgroundMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<PublicSiteBackground, unknown, SiteBackgroundChange>({
    mutationFn: saveSiteBackground,
    onSuccess: async (background) => {
      queryClient.setQueryData(siteConfigQueryKeys.background(), background)
      await queryClient.invalidateQueries({
        queryKey: siteConfigQueryKeys.background(),
      })
    },
  })
}
