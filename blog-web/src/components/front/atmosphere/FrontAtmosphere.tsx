import { useRef } from 'react'

import { FrontPetalToggle } from '@/components/front/atmosphere/FrontPetalToggle'
import { PointerPetals } from '@/components/front/atmosphere/PointerPetals'
import { useAmbientPetals } from '@/hooks/front/ambientPetals'
import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { usePetalPreference } from '@/hooks/front/petalPreference'

export const FrontAtmosphere = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { motionAllowed } = useFrontMotionPreference()
  const { enabled: petalsEnabled } = usePetalPreference()
  useAmbientPetals(canvasRef, motionAllowed && petalsEnabled)

  return (
    <>
      <canvas className="front-petals" ref={canvasRef} aria-hidden="true" />
      <PointerPetals />
      <FrontPetalToggle variant="desktop" />
    </>
  )
}
