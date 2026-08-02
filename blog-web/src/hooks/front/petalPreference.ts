import { useSyncExternalStore } from 'react'

const PETAL_KEY = 'front-petals-enabled'
const OBSOLETE_MOTION_KEYS = [
  'front-motion-enabled',
  'front-motion-preference-version',
] as const

let savedPetalsEnabled: boolean | undefined
const listeners = new Set<() => void>()

const readPetalPreference = () => {
  if (savedPetalsEnabled !== undefined) return savedPetalsEnabled

  try {
    for (const key of OBSOLETE_MOTION_KEYS) localStorage.removeItem(key)
    const saved = localStorage.getItem(PETAL_KEY)
    savedPetalsEnabled = saved === null ? true : JSON.parse(saved) === true
  } catch {
    savedPetalsEnabled = true
  }

  return savedPetalsEnabled
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== PETAL_KEY) return
    savedPetalsEnabled = undefined
    listener()
  }

  window.addEventListener('storage', handleStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}

const setPetalsEnabled = (enabled: boolean) => {
  savedPetalsEnabled = enabled

  try {
    localStorage.setItem(PETAL_KEY, JSON.stringify(enabled))
    for (const key of OBSOLETE_MOTION_KEYS) localStorage.removeItem(key)
  } catch {
    // 存储不可用时，本次页面生命周期仍保持一致状态。
  }

  listeners.forEach((listener) => listener())
}

export const usePetalPreference = () => {
  const enabled = useSyncExternalStore(
    subscribe,
    readPetalPreference,
    () => true,
  )

  return { enabled, setEnabled: setPetalsEnabled }
}
