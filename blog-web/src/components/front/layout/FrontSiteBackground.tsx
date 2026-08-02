import { FrontArticleImage } from '@/components/front/article'
import { usePublicSiteBackgroundQuery } from '@/queries/siteConfig'

export const FrontSiteBackground = () => {
  const siteBackground = usePublicSiteBackgroundQuery()
  const backgroundUrl = siteBackground.data?.backgroundUrl

  return backgroundUrl ? <FrontArticleImage src={backgroundUrl} alt="" /> : null
}
