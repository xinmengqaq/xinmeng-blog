import { createContext } from 'react'
import type { PublicMusic } from '@/types/music'

export type FrontMusicPlayerValue = {
  current: PublicMusic | undefined
  currentIndex: number
  currentTime: number
  duration: number
  isPlaying: boolean
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  selectTrack: (index: number) => void
  setVolume: (volume: number) => void
  togglePlayback: () => void
  tracks: PublicMusic[]
  volume: number
}

export const FrontMusicPlayerContext =
  createContext<FrontMusicPlayerValue | null>(null)
