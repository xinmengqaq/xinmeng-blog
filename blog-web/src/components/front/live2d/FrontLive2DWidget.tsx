import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { frontLive2DConfig } from '@/config/frontLive2D'

import type { Live2DInstance } from './live2dRuntime'
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
  const cleanupRef = useRef<Live2DInstance['cleanup'] | undefined>(undefined)

  useEffect(() => {
    let frame = 0
    const handleScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        syncBannerVisibility()
      })
    }
    syncBannerVisibility()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [pathname])

  useEffect(() => {
    const model = frontLive2DConfig.model
    if (!model || (!model.cubism2Path && !model.cubism5Path)) return

    const desktopQuery = window.matchMedia(frontLive2DConfig.desktopMediaQuery)
    let disposed = false
    let mounting = false

    const unmountWidget = () => {
      cleanupRef.current?.()
      cleanupRef.current = undefined
    }

    const syncWidget = async () => {
      if (!desktopQuery.matches) {
        unmountWidget()
        return
      }
      if (cleanupRef.current || mounting || !isBannerClear()) return

      mounting = true
      await Promise.resolve()
      if (disposed || !desktopQuery.matches || !isBannerClear()) {
        mounting = false
        return
      }

      try {
        const instance = await mountFrontLive2D(
          model,
          selectFrontLive2DTools(model),
        )

        if (disposed || !desktopQuery.matches) instance.cleanup()
        else {
          cleanupRef.current = instance.cleanup
          syncBannerVisibility()
        }
      } catch {
        unmountWidget()
      } finally {
        mounting = false
      }
    }

    let scrollFrame = 0
    const handleScroll = () => {
      if (scrollFrame) return
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0
        void syncWidget()
      })
    }

    void syncWidget()
    window.addEventListener('scroll', handleScroll, { passive: true })
    desktopQuery.addEventListener('change', syncWidget)

    return () => {
      disposed = true
      window.cancelAnimationFrame(scrollFrame)
      window.removeEventListener('scroll', handleScroll)
      desktopQuery.removeEventListener('change', syncWidget)
      unmountWidget()
    }
  }, [])

  return null
}
