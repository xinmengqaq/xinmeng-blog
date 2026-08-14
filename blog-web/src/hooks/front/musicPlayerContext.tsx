import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useAudioPreview } from '@/hooks/useAudioPreview'
import { usePublicMusicQuery } from '@/queries/music'
import {
  FrontMusicPlayerContext,
  type FrontMusicPlayerValue,
} from './frontMusicPlayerContext'

export const FrontMusicPlayerProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const query = usePublicMusicQuery()
  const tracks = useMemo(() => query.data?.items ?? [], [query.data?.items])
  const [currentIndex, setCurrentIndex] = useState(0)
  const initializedRef = useRef(false)
  const {
    currentTime,
    duration: audioDuration,
    play,
    playingId,
    seek,
    setVolume,
    togglePlayback: toggleAudioPlayback,
    volume,
  } = useAudioPreview(() => undefined, 0.5)
  const current = tracks[currentIndex]

  useEffect(() => {
    if (initializedRef.current || !query.isSuccess || !tracks[0]) return
    initializedRef.current = true
    void play(tracks[0], true)
  }, [play, query.isSuccess, tracks])

  const selectTrack = useCallback(
    (index: number) => {
      const track = tracks[index]
      if (!track) return
      setCurrentIndex(index)
      void play(track)
    },
    [play, tracks],
  )

  const changeTrack = useCallback(
    (offset: number) => {
      if (!tracks.length) return
      const nextIndex = (currentIndex + offset + tracks.length) % tracks.length
      selectTrack(nextIndex)
    },
    [currentIndex, selectTrack, tracks.length],
  )

  const togglePlayback = useCallback(() => {
    if (current) void toggleAudioPlayback(current)
  }, [current, toggleAudioPlayback])

  const duration = current
    ? audioDuration || current.duration_ms / 1000
    : audioDuration
  const value = useMemo<FrontMusicPlayerValue>(
    () => ({
      current,
      currentIndex,
      currentTime,
      duration,
      isPlaying: Boolean(current && playingId === current.id),
      next: () => changeTrack(1),
      previous: () => changeTrack(-1),
      seek,
      selectTrack,
      setVolume,
      togglePlayback,
      tracks,
      volume,
    }),
    [
      changeTrack,
      current,
      currentIndex,
      currentTime,
      duration,
      playingId,
      seek,
      selectTrack,
      setVolume,
      togglePlayback,
      tracks,
      volume,
    ],
  )

  return (
    <FrontMusicPlayerContext.Provider value={value}>
      {children}
    </FrontMusicPlayerContext.Provider>
  )
}
