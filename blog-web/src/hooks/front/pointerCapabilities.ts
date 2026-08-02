import { useSyncExternalStore } from 'react'

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

const subscribe = (listener: () => void) => {
  const media = window.matchMedia(FINE_POINTER_QUERY)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

export const useFinePointer = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(FINE_POINTER_QUERY).matches,
    () => false,
  )
