import { useEffect, useState } from 'react'

import { FrontArticleImage } from '@/components/front/article'
import { useFrontPageTransitionActive } from '@/hooks/front/pageTransitionContext'
import { usePublicSiteBackgroundQuery } from '@/queries/siteConfig'

export const FrontSiteBackground = () => {
  const siteBackground = usePublicSiteBackgroundQuery()
  const pageTransitionActive = useFrontPageTransitionActive()
  const backgroundUrl = siteBackground.data?.backgroundUrl
  const [readyUrl, setReadyUrl] = useState<string | null>(null)
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (backgroundUrl && readyUrl === backgroundUrl && !pageTransitionActive) {
      const frame = requestAnimationFrame(() => setRevealedUrl(backgroundUrl))
      return () => cancelAnimationFrame(frame)
    }
  }, [backgroundUrl, pageTransitionActive, readyUrl])

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

  const ready = revealedUrl === backgroundUrl
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
