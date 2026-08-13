import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'

import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { useFrontMusicPlayer } from '@/hooks/front/musicPlayerContext'

import './floatingMusicPlayer.css'

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

gsap.registerPlugin(useGSAP)

export const FloatingMusicPlayer = () => {
  const rootRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [docked, setDocked] = useState(false)
  const { reducedMotion } = useFrontMotionPreference()
  const {
    current,
    currentIndex,
    currentTime,
    duration,
    isPlaying,
    next,
    previous,
    seek,
    selectTrack,
    setVolume,
    togglePlayback,
    tracks,
    volume,
  } = useFrontMusicPlayer()

  useGSAP(
    () => {
      const panel = panelRef.current
      if (!panel) return
      gsap.to(panel, {
        autoAlpha: expanded ? 1 : 0,
        x: expanded ? 0 : -18,
        scaleX: expanded ? 1 : 0.92,
        duration: reducedMotion ? 0 : expanded ? 0.26 : 0.16,
        ease: expanded ? 'power3.out' : 'power2.in',
        pointerEvents: expanded ? 'auto' : 'none',
        overwrite: 'auto',
      })
    },
    { scope: rootRef, dependencies: [expanded, reducedMotion] },
  )

  useGSAP(
    () => {
      const list = listRef.current
      if (!list) return
      gsap.to(list, {
        autoAlpha: listOpen ? 1 : 0,
        y: listOpen ? 0 : 12,
        scale: listOpen ? 1 : 0.98,
        duration: reducedMotion ? 0 : listOpen ? 0.24 : 0.15,
        ease: listOpen ? 'power3.out' : 'power2.in',
        pointerEvents: listOpen ? 'auto' : 'none',
        overwrite: 'auto',
      })
    },
    { scope: rootRef, dependencies: [listOpen, reducedMotion] },
  )

  if (!current) return null

  const progress =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0
  const closeIfFocusLeaves = (nextTarget: EventTarget | null) => {
    if (listOpen || rootRef.current?.contains(nextTarget as Node)) return
    setExpanded(false)
  }

  return (
    <aside
      ref={rootRef}
      aria-label="浮层音乐播放器"
      className={`floating-music-player${expanded ? ' is-expanded' : ''}${docked ? ' is-docked' : ''}`}
      onBlur={(event) => closeIfFocusLeaves(event.relatedTarget)}
      onFocus={() => setExpanded(true)}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        if (!listOpen) setExpanded(false)
      }}
    >
      <div ref={listRef} className="floating-music-player__playlist">
        <header>
          <span>
            <Music2 aria-hidden="true" size={19} />
            播放列表
          </span>
          <button
            aria-label="关闭播放列表"
            type="button"
            onClick={() => setListOpen(false)}
          >
            <X size={19} />
          </button>
        </header>
        <div className="floating-music-player__playlist-items">
          {tracks.map((track, index) => {
            const active = index === currentIndex
            return (
              <button
                key={track.id}
                aria-current={active ? 'true' : undefined}
                className={active ? 'is-active' : undefined}
                type="button"
                onClick={() => selectTrack(index)}
              >
                {active && isPlaying ? (
                  <Pause size={17} />
                ) : (
                  <Music2 size={17} />
                )}
                <span>{track.title}</span>
                {active && isPlaying ? (
                  <span
                    className="floating-music-player__bars"
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <button
        aria-label={isPlaying ? '暂停' : '播放'}
        className="floating-music-player__disc"
        type="button"
        onClick={togglePlayback}
      >
        <span
          className="floating-music-player__disc-progress"
          style={
            { '--music-progress': `${progress * 3.6}deg` } as CSSProperties
          }
        />
        {isPlaying ? <Pause size={27} /> : <Play size={27} />}
      </button>

      <div ref={panelRef} className="floating-music-player__panel">
        <div className="floating-music-player__track">
          <strong title={current.title}>{current.title}</strong>
          <span>{`${formatTime(currentTime)} / ${formatTime(duration)}`}</span>
          <input
            aria-label="浮层播放进度"
            className="floating-music-player__range"
            max={duration || 0}
            min="0"
            step="1"
            type="range"
            value={Math.min(currentTime, duration || 0)}
            style={{ '--range-progress': `${progress}%` } as CSSProperties}
            onChange={(event) => seek(Number(event.target.value))}
          />
        </div>
        <div className="floating-music-player__controls">
          <button
            aria-label="上一首"
            className="floating-music-player__skip"
            type="button"
            onClick={previous}
          >
            <SkipBack size={19} />
          </button>
          <button
            aria-label={isPlaying ? '暂停' : '播放'}
            className="is-primary is-play-control"
            type="button"
            onClick={togglePlayback}
          >
            {isPlaying ? <Pause size={21} /> : <Play size={21} />}
          </button>
          <button
            aria-label="下一首"
            className="floating-music-player__skip"
            type="button"
            onClick={next}
          >
            <SkipForward size={19} />
          </button>
          <label className="floating-music-player__volume">
            <Volume2 aria-hidden="true" size={17} />
            <input
              aria-label="浮层音量"
              className="floating-music-player__range"
              max="1"
              min="0"
              step="0.05"
              type="range"
              value={volume}
              style={
                { '--range-progress': `${volume * 100}%` } as CSSProperties
              }
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>
          <button
            aria-expanded={listOpen}
            aria-label="播放列表"
            className={listOpen ? 'is-primary' : undefined}
            type="button"
            onClick={() => setListOpen((value) => !value)}
          >
            <ListMusic size={20} />
          </button>
        </div>
      </div>
      <button
        aria-label={docked ? '展开音乐播放器' : '收起音乐播放器'}
        className="floating-music-player__dock-toggle"
        type="button"
        onClick={() => {
          setDocked((value) => !value)
          setListOpen(false)
        }}
      >
        {docked ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  )
}
