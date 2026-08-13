import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'

import { FrontArticleImage } from '@/components/front/article'
import { FrontAtmosphere } from '@/components/front/atmosphere/FrontAtmosphere'
import { FrontBrandMark } from '@/components/front/visual/FrontBrandMark'
import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { usePublicSiteBackgroundQuery } from '@/queries/siteConfig'
import '@/styles/front-identity.css'
import '@/styles/front-motion.css'
import '@/styles/front-typography.css'
import '@/styles/generated/chill-round-gothic.css'

import './accountGuest.css'

gsap.registerPlugin(useGSAP)

type AccountGuestShellProps = {
  title: string
  children: ReactNode
  tabs?: boolean
  activeTab?: 'login' | 'register'
}

export const AccountGuestShell = ({
  title,
  children,
  tabs = false,
  activeTab,
}: AccountGuestShellProps) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const { reducedMotion } = useFrontMotionPreference()
  const background = usePublicSiteBackgroundQuery()

  useGSAP(
    () => {
      if (reducedMotion) {
        gsap.set('[data-account-nav], [data-account-panel]', {
          autoAlpha: 1,
          clearProps: 'transform',
        })
        return
      }

      const entrance = gsap.timeline({
        defaults: { ease: 'power2.out', overwrite: 'auto' },
      })
      entrance
        .fromTo(
          '[data-account-nav]',
          { autoAlpha: 0, y: -8 },
          { autoAlpha: 1, y: 0, duration: 0.22 },
        )
        .fromTo(
          '[data-account-panel]',
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.3 },
          '<0.08',
        )
    },
    { scope: rootRef, dependencies: [reducedMotion], revertOnUpdate: true },
  )

  return (
    <div className="account-guest" ref={rootRef}>
      <header className="account-guest__header" data-account-nav>
        <Link to="/" className="account-guest__brand" aria-label="薪梦集首页">
          <FrontBrandMark />
        </Link>
        <Link
          aria-label="返回首页"
          className="account-guest__home-link"
          to="/"
        >
          <ArrowLeft aria-hidden="true" />
          <span>返回首页</span>
        </Link>
      </header>
      <div className="account-guest__media" aria-hidden="true">
        <FrontArticleImage
          alt=""
          className="account-guest__background"
          decoding="async"
          fetchPriority="high"
          loading="eager"
          src={background.data?.backgroundUrl}
        />
        <span className="account-guest__scrim" />
      </div>
      <main className="account-guest__main">
        <section
          aria-labelledby="account-guest-title"
          className="account-guest__panel"
          data-account-panel
        >
          {tabs ? (
            <nav className="account-guest__tabs" aria-label="账户入口">
              <Link
                aria-current={activeTab === 'login' ? 'page' : undefined}
                className={activeTab === 'login' ? 'is-active' : ''}
                to="/login"
              >
                登录
              </Link>
              <Link
                aria-current={activeTab === 'register' ? 'page' : undefined}
                className={activeTab === 'register' ? 'is-active' : ''}
                to="/register"
              >
                注册
              </Link>
            </nav>
          ) : null}
          <h1 id="account-guest-title" tabIndex={-1}>
            {title}
          </h1>
          {children}
        </section>
      </main>
      <FrontAtmosphere />
    </div>
  )
}
