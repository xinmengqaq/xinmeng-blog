import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'

import { PointerPetalController } from '@/components/front/atmosphere/PointerPetalController'
import { frontIllustrationAssets } from '@/components/front/visual/frontAssets'
import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { useFinePointer } from '@/hooks/front/pointerCapabilities'

gsap.registerPlugin(useGSAP)

const PARTICLE_COUNT = 8
const TRAIL_POOL_SIZE = 18

export const PointerPetals = () => {
  const rootRef = useRef<HTMLDivElement>(null)
  const followerRef = useRef<HTMLImageElement>(null)
  const trailRefs = useRef<Array<HTMLSpanElement | null>>([])
  const particleRefs = useRef<Array<HTMLSpanElement | null>>([])
  const { motionAllowed } = useFrontMotionPreference()
  const finePointer = useFinePointer()

  useGSAP(
    (_context, contextSafe) => {
      const follower = followerRef.current
      const trail = trailRefs.current.filter(
        (particle): particle is HTMLSpanElement => particle !== null,
      )
      const particles = particleRefs.current.filter(
        (particle): particle is HTMLSpanElement => particle !== null,
      )
      const all = follower ? [follower, ...trail, ...particles] : []
      gsap.set(all, { autoAlpha: 0 })
      if (
        !motionAllowed ||
        !finePointer ||
        !contextSafe ||
        !follower ||
        trail.length === 0 ||
        particles.length === 0
      )
        return

      const controller = new PointerPetalController({
        follower,
        trail,
        particles,
      })
      const onMove = contextSafe((event: PointerEvent) =>
        controller.move(event),
      )
      const onDown = contextSafe((event: PointerEvent) =>
        controller.down(event),
      )
      const onUp = contextSafe((event: PointerEvent) => controller.up(event))
      const onCancel = contextSafe(() => controller.cancel())
      const onDeactivate = contextSafe(() => controller.deactivate())
      const onSelection = contextSafe(() => controller.selectionChange())
      const onPointerOut = contextSafe((event: PointerEvent) =>
        controller.pointerOut(event),
      )

      document.addEventListener('pointermove', onMove, { passive: true })
      document.addEventListener('pointerdown', onDown, { passive: true })
      document.addEventListener('pointerup', onUp, { passive: true })
      document.addEventListener('pointercancel', onCancel)
      document.addEventListener('selectionchange', onSelection)
      document.addEventListener('visibilitychange', onDeactivate)
      window.addEventListener('pointerout', onPointerOut)
      window.addEventListener('dragstart', onDeactivate)
      window.addEventListener('dragend', onDeactivate)
      window.addEventListener('blur', onDeactivate)

      return () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerdown', onDown)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('pointercancel', onCancel)
        document.removeEventListener('selectionchange', onSelection)
        document.removeEventListener('visibilitychange', onDeactivate)
        window.removeEventListener('pointerout', onPointerOut)
        window.removeEventListener('dragstart', onDeactivate)
        window.removeEventListener('dragend', onDeactivate)
        window.removeEventListener('blur', onDeactivate)
        controller.destroy()
      }
    },
    {
      scope: rootRef,
      dependencies: [finePointer, motionAllowed],
      revertOnUpdate: true,
    },
  )

  return (
    <div className="front-pointer-petals" ref={rootRef} aria-hidden="true">
      <img
        className="front-pointer-petals__follower"
        ref={followerRef}
        src={frontIllustrationAssets.pixelSakuraCursor}
        alt=""
        draggable={false}
      />
      {Array.from({ length: TRAIL_POOL_SIZE }, (_, index) => (
        <span
          className={`front-pointer-petals__trail front-pointer-petals__trail--${(index % 4) + 1}`}
          key={`trail-${index}`}
          ref={(node) => {
            trailRefs.current[index] = node
          }}
        />
      ))}
      {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
        <span
          className={`front-pointer-petals__particle front-pointer-petals__particle--${(index % 3) + 1}`}
          key={index}
          ref={(node) => {
            particleRefs.current[index] = node
          }}
        />
      ))}
    </div>
  )
}
