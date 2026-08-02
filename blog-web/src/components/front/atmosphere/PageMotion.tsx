import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { useFrontMotionPreference } from '@/hooks/front/motionPreference'

gsap.registerPlugin(useGSAP)

export const PageMotion = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const { motionAllowed } = useFrontMotionPreference()
  const motionAllowedRef = useRef(motionAllowed)
  motionAllowedRef.current = motionAllowed
  useGSAP(
    () => {
      const root = ref.current
      if (!root) return

      const articleRows = gsap.utils.toArray<HTMLElement>(
        '.article-result',
        root,
      )

      if (motionAllowedRef.current) {
        gsap.fromTo(
          root,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.32,
            ease: 'power1.out',
            clearProps: 'opacity,visibility',
          },
        )
        if (articleRows.length > 0) {
          gsap.fromTo(
            articleRows,
            { autoAlpha: 0, x: (index) => (index % 2 ? -20 : 20) },
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.55,
              stagger: 0.08,
              ease: 'power2.out',
              clearProps: 'transform,opacity,visibility',
            },
          )
        }
        return
      }

      gsap.set([root, ...articleRows], { clearProps: 'all' })
    },
    {
      scope: ref,
      dependencies: [location.pathname, location.search],
      revertOnUpdate: true,
    },
  )

  useEffect(() => {
    if (motionAllowed || !ref.current) return

    const articleRows = gsap.utils.toArray<HTMLElement>(
      '.article-result',
      ref.current,
    )
    const targets = [ref.current, ...articleRows]
    gsap.killTweensOf(targets)
    gsap.set(targets, { clearProps: 'all' })
  }, [motionAllowed])

  return <div ref={ref}>{children}</div>
}
