import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { FrontHeader } from '@/components/front/layout/FrontHeader'
import { FrontFooter } from '@/components/front/layout/FrontFooter'
import { FrontPageScrollbar } from '@/components/front/layout/FrontPageScrollbar'
import { FrontLive2DWidget } from '@/components/front/live2d'
import { FloatingMusicPlayer } from '@/components/front/music/FloatingMusicPlayer'
import { FrontAtmosphere } from '@/components/front/atmosphere/FrontAtmosphere'
import { PageMotion } from '@/components/front/atmosphere/PageMotion'
import { PageTransition } from '@/components/front/atmosphere/PageTransition'
import { frontSite } from '@/config/frontSite'
import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { FrontMusicPlayerProvider } from '@/hooks/front/musicPlayerContext'
import { usePageTransitionActive } from '@/hooks/front/pageTransition'
import {
  FrontHomeHeroSettledContext,
  FrontPageTransitionContext,
} from '@/hooks/front/pageTransitionContext'
import '@/styles/front.css'
import '@/styles/front-home-featured-rail.css'
import '@/styles/front-home.css'
import '@/styles/front-scrollbar.css'
import '@/styles/front-identity.css'
import '@/styles/generated/chill-round-gothic.css'
import '@/styles/front-typography.css'
import '@/styles/front-motion.css'

let hasReportedFontLoadingError = false

export const FrontLayout = () => {
  const { motionAllowed } = useFrontMotionPreference()
  const { key: locationKey, pathname } = useLocation()
  const [homeHeroSettledKey, setHomeHeroSettledKey] = useState<string | null>(
    null,
  )

  const waitingForHomeHero =
    pathname === '/' && homeHeroSettledKey !== locationKey
  const pageTransitionActive = usePageTransitionActive(waitingForHomeHero)
  const reportHomeHeroSettled = useCallback(() => {
    if (pathname === '/') setHomeHeroSettledKey(locationKey)
  }, [locationKey, pathname])

  useEffect(() => {
    document.title = frontSite.name

    const reportFontLoadingError = () => {
      if (hasReportedFontLoadingError) return
      hasReportedFontLoadingError = true
      window.alert('字体加载失败，请刷新页面重试。')
    }

    document.fonts.addEventListener('loadingerror', reportFontLoadingError)
    return () =>
      document.fonts.removeEventListener('loadingerror', reportFontLoadingError)
  }, [])

  return (
    <FrontHomeHeroSettledContext.Provider value={reportHomeHeroSettled}>
      <FrontPageTransitionContext.Provider value={pageTransitionActive}>
        <FrontMusicPlayerProvider>
          <div
            className={`app-shell app-shell--front ${motionAllowed ? 'front-motion-is-enabled' : 'front-motion-is-static'}`}
          >
            <PageTransition active={pageTransitionActive} />
            <FrontHeader />
            <main className="app-main">
              <PageMotion>
                <Outlet />
              </PageMotion>
            </main>
            <FrontFooter />
            <FrontAtmosphere />
            <FrontPageScrollbar />
            <FloatingMusicPlayer />
            <FrontLive2DWidget />
          </div>
        </FrontMusicPlayerProvider>
      </FrontPageTransitionContext.Provider>
    </FrontHomeHeroSettledContext.Provider>
  )
}
