import { useCallback, useEffect, useRef, useState } from 'react'

type AudioTrack = { id: number; audio_url: string }

export const useAudioPreview = (
  onError: (message: string) => void,
  initialVolume = 1,
) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const trackIdRef = useRef<number | null>(null)
  const onErrorRef = useRef(onError)
  const volumeRef = useRef(initialVolume)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(initialVolume)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const stopPreview = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    audioRef.current = null
    trackIdRef.current = null
    setPlayingId(null)
    setCurrentTime(0)
    setDuration(0)
  }, [])

  useEffect(() => stopPreview, [stopPreview])

  const loadTrack = useCallback(
    (track: AudioTrack) => {
      stopPreview()
      const audio = new Audio(track.audio_url)
      audio.preload = 'auto'
      audio.volume = volumeRef.current
      audioRef.current = audio
      trackIdRef.current = track.id
      audio.addEventListener('timeupdate', () =>
        setCurrentTime(audio.currentTime),
      )
      audio.addEventListener('loadedmetadata', () =>
        setDuration(audio.duration),
      )
      audio.addEventListener('ended', stopPreview, { once: true })
      audio.addEventListener(
        'error',
        () => {
          stopPreview()
          onErrorRef.current('无法播放该音乐，请检查音频文件。')
        },
        { once: true },
      )
      return audio
    },
    [stopPreview],
  )

  const play = useCallback(
    async (track: AudioTrack, silentFailure = false) => {
      const audio =
        trackIdRef.current === track.id && audioRef.current
          ? audioRef.current
          : loadTrack(track)
      try {
        await audio.play()
        setPlayingId(track.id)
        return true
      } catch {
        setPlayingId(null)
        if (!silentFailure) onErrorRef.current('浏览器未能开始播放，请重试。')
        return false
      }
    },
    [loadTrack],
  )

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setPlayingId(null)
  }, [])

  const togglePreview = useCallback(
    async (track: AudioTrack) => {
      if (playingId === track.id) {
        stopPreview()
        return
      }
      await play(track)
    },
    [play, playingId, stopPreview],
  )

  const togglePlayback = useCallback(
    async (track: AudioTrack) => {
      if (playingId === track.id) {
        pause()
        return
      }
      await play(track)
    },
    [pause, play, playingId],
  )

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (audio) audio.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

  const setVolume = useCallback((nextVolume: number) => {
    volumeRef.current = nextVolume
    const audio = audioRef.current
    if (audio) audio.volume = nextVolume
    setVolumeState(nextVolume)
  }, [])

  return {
    currentTime,
    duration,
    pause,
    play,
    playingId,
    seek,
    setVolume,
    stopPreview,
    togglePlayback,
    togglePreview,
    volume,
  }
}
