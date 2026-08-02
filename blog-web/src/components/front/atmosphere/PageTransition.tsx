import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { frontBrandAssets } from '@/components/front/visual/frontAssets'
import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { useCurrentPublicPageWaiting } from '@/hooks/front/pageTransition'
import './PageTransition.css'

gsap.registerPlugin(useGSAP)

const MINIMUM_VISIBLE_MS = 450

export const PageTransition = () => {
  const { pathname } = useLocation()
  const pageWaiting = useCurrentPublicPageWaiting()
  const { motionAllowed } = useFrontMotionPreference()
  const rootRef = useRef<HTMLDivElement>(null)
  const visibleSinceRef = useRef<number | null>(null)
  const suppressInitialHomeTransitionRef = useRef(pathname === '/')
  const waiting =
    pageWaiting &&
    !(suppressInitialHomeTransitionRef.current && pathname === '/')
  const [visible, setVisible] = useState(waiting)
  const active = waiting || visible

  useEffect(() => {
    if (pathname !== '/') suppressInitialHomeTransitionRef.current = false
  }, [pathname])

  useEffect(() => {
    if (waiting) {
      visibleSinceRef.current ??= performance.now()
      setVisible(true)
      return
    }

    if (visibleSinceRef.current === null) {
      setVisible(false)
      return
    }

    const remaining = Math.max(
      0,
      MINIMUM_VISIBLE_MS - (performance.now() - visibleSinceRef.current),
    )
    const finish = () => {
      visibleSinceRef.current = null
      setVisible(false)
    }

    if (remaining === 0) {
      finish()
      return
    }

    const timer = window.setTimeout(finish, remaining)
    return () => window.clearTimeout(timer)
  }, [waiting])

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const progress = root.querySelector('.front-page-transition__progress')
      const stations = gsap.utils.toArray<HTMLElement>(
        '.front-page-transition__station',
      )

      if (!motionAllowed) {
        gsap.set(root, { autoAlpha: active ? 1 : 0 })
        gsap.set(stations, { autoAlpha: 1, scale: 1 })
        return
      }

      if (!active) {
        gsap.set(root, { autoAlpha: 0 })
        return
      }

      gsap.fromTo(
        root,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.18, ease: 'power1.out' },
      )
      gsap.set(stations, { autoAlpha: 0.42, scale: 1 })
      gsap
        .timeline({ repeat: -1, defaults: { ease: 'power1.inOut' } })
        .to(progress, { rotation: 360, duration: 1.6, ease: 'none' }, 0)
        .to(
          stations,
          {
            autoAlpha: 1,
            scale: 1.3,
            duration: 0.18,
            stagger: 0.36,
            yoyo: true,
            repeat: 1,
          },
          0,
        )
    },
    {
      scope: rootRef,
      dependencies: [active, motionAllowed],
      revertOnUpdate: true,
    },
  )

  return (
    <div
      ref={rootRef}
      className="front-page-transition"
      role={active ? 'status' : undefined}
      aria-live={active ? 'polite' : undefined}
      aria-label={active ? '页面内容正在加载' : undefined}
      aria-hidden={active ? undefined : true}
    >
      <div className="front-page-transition__loader" aria-hidden="true">
        <div className="front-page-transition__track">
          <div className="front-page-transition__progress">
            <span className="front-page-transition__petal" />
          </div>
          {['north', 'east', 'south', 'west'].map((position) => (
            <span
              className={`front-page-transition__station is-${position}`}
              key={position}
            />
          ))}
          <img src={frontBrandAssets.simplifiedMark} alt="" draggable={false} />
        </div>
        <span className="front-page-transition__label">正在抵达</span>
      </div>
    </div>
  )
}
