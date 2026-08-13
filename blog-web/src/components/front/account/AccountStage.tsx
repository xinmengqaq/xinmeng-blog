import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { ReactNode } from 'react'
import { useRef } from 'react'

import { useFrontMotionPreference } from '@/hooks/front/motionPreference'

gsap.registerPlugin(useGSAP)

export const AccountStage = ({ children }: { children: ReactNode }) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const { reducedMotion } = useFrontMotionPreference()

  useGSAP(
    () => {
      if (reducedMotion) return
      gsap.fromTo(
        rootRef.current,
        { autoAlpha: 0, y: 8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.22,
          ease: 'power2.out',
          overwrite: 'auto',
        },
      )
    },
    { scope: rootRef, dependencies: [reducedMotion], revertOnUpdate: true },
  )

  return (
    <div className="account-form__stage" ref={rootRef}>
      {children}
    </div>
  )
}
