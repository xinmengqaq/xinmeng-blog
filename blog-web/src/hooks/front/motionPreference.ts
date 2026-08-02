import { useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const subscribeToReducedMotion = (listener: () => void) => {
  const media = window.matchMedia(REDUCED_MOTION_QUERY)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

export const useFrontMotionPreference = () => {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )

  return {
    reducedMotion,
    motionAllowed: !reducedMotion,
  }
}
