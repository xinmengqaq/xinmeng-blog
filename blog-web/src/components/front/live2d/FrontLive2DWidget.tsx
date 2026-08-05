import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { frontLive2DConfig } from '@/config/frontLive2D'

import { mountFrontLive2D } from './live2dRuntime'
import { selectFrontLive2DTools } from './live2dTools'

const LIVE2D_TOP_FROM_VIEWPORT_BOTTOM = 285

const isBannerClear = () => {
  const banner = document.querySelector<HTMLElement>('.front-scene-banner')
  return (
    !banner ||
    banner.getBoundingClientRect().bottom <=
      window.innerHeight - LIVE2D_TOP_FROM_VIEWPORT_BOTTOM
  )
}

const syncBannerVisibility = () => {
  const hideWidget = !isBannerClear()

  for (const id of ['waifu', 'waifu-toggle']) {
    document
      .getElementById(id)
      ?.classList.toggle('live2d-is-over-banner', hideWidget)
  }
}

export const FrontLive2DWidget = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    syncBannerVisibility()
    window.addEventListener('scroll', syncBannerVisibility, { passive: true })
    return () => window.removeEventListener('scroll', syncBannerVisibility)
  }, [pathname])

  useEffect(() => {
    const model = frontLive2DConfig.model
    if (!model || (!model.cubism2Path && !model.cubism5Path)) return

    const desktopQuery = window.matchMedia(frontLive2DConfig.desktopMediaQuery)
    let disposed = false
    let mounting = false
    let cleanup: (() => void) | undefined

    const unmountWidget = () => {
      cleanup?.()
      cleanup = undefined
    }

    const syncWidget = async () => {
      if (!desktopQuery.matches) {
        unmountWidget()
        return
      }
      if (cleanup || mounting || !isBannerClear()) return

      mounting = true
      await Promise.resolve()
      if (disposed || !desktopQuery.matches || !isBannerClear()) {
        mounting = false
        return
      }

      try {
        const mountedCleanup = await mountFrontLive2D(
          model,
          selectFrontLive2DTools(model),
        )

        if (disposed || !desktopQuery.matches) mountedCleanup()
        else {
          cleanup = mountedCleanup
          syncBannerVisibility()
        }
      } catch {
        unmountWidget()
      } finally {
        mounting = false
      }
    }

    void syncWidget()
    window.addEventListener('scroll', syncWidget, { passive: true })
    desktopQuery.addEventListener('change', syncWidget)

    return () => {
      disposed = true
      window.removeEventListener('scroll', syncWidget)
      desktopQuery.removeEventListener('change', syncWidget)
      unmountWidget()
    }
  }, [])

  return null
}
