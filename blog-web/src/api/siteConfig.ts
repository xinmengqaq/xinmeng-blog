import type { PublicSiteBackground } from '@/types/siteConfig'
import { publicRequest } from '@/utils/request'

type PublicSiteBackgroundResponse = {
  backgroundUrl?: string | null
}

export const getPublicSiteBackground =
  async (): Promise<PublicSiteBackground> => {
    const response = await publicRequest.get<PublicSiteBackgroundResponse>(
      '/site-config/background',
    )

    return { backgroundUrl: response.backgroundUrl ?? null }
  }
