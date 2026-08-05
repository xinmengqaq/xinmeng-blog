import { useState } from 'react'

import { FrontArticleImage } from '@/components/front/article'
import { usePublicSiteBackgroundQuery } from '@/queries/siteConfig'

export const FrontSiteBackground = () => {
  const siteBackground = usePublicSiteBackgroundQuery()
  const backgroundUrl = siteBackground.data?.backgroundUrl
  const [readyUrl, setReadyUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (siteBackground.isError) {
    return (
      <div
        className="front-image front-image--placeholder front-site-background is-error"
        aria-hidden="true"
      />
    )
  }

  if (!backgroundUrl) {
    if (!siteBackground.isSuccess) return null

    return (
      <div
        className="front-image front-image--placeholder front-site-background is-empty"
        aria-hidden="true"
      />
    )
  }

  const ready = readyUrl === backgroundUrl
  const failed = failedUrl === backgroundUrl

  return (
    <FrontArticleImage
      src={backgroundUrl}
      alt=""
      className={`front-site-background${ready ? ' is-ready' : failed ? ' is-error' : ''}`}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      onReady={(result) => {
        if (result === 'loaded') {
          setReadyUrl(backgroundUrl)
          setFailedUrl(null)
          return
        }

        setFailedUrl(backgroundUrl)
        setReadyUrl(null)
      }}
    />
  )
}
