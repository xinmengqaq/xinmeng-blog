import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useRef, type CSSProperties } from 'react'

import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { useFrontMusicPlayer } from '@/hooks/front/musicPlayerContext'
import { useFrontPageTransitionActive } from '@/hooks/front/pageTransitionContext'

import './heroMusicPlayer.css'

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

gsap.registerPlugin(useGSAP)

let heroMusicPlayerIntroHasPlayed = false

export const HeroMusicPlayer = () => {
  const rootRef = useRef<HTMLElement>(null)
  const {
    current,
    currentTime,
    duration,
    isPlaying,
    next,
    previous,
    seek,
    setVolume,
    togglePlayback,
    volume,
  } = useFrontMusicPlayer()
  const { motionAllowed, reducedMotion } = useFrontMotionPreference()
  const pageTransitionActive = useFrontPageTransitionActive()

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root || !current) return
      if (pageTransitionActive) return

      if (!motionAllowed || heroMusicPlayerIntroHasPlayed) {
        if (!motionAllowed) heroMusicPlayerIntroHasPlayed = true
        gsap.set(root, {
          clearProps: 'transform,opacity,visibility,will-change',
        })
        return
      }

      const tween = gsap.fromTo(
        root,
        {
          autoAlpha: 0,
          y: 12,
          scale: 0.98,
          willChange: 'transform, opacity',
        },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.32,
          ease: 'power3.out',
          onComplete: () => {
            heroMusicPlayerIntroHasPlayed = true
            gsap.set(root, {
              clearProps: 'transform,opacity,visibility,will-change',
            })
          },
        },
      )

      return () => tween.kill()
    },
    {
      scope: rootRef,
      dependencies: [Boolean(current), motionAllowed, pageTransitionActive],
      revertOnUpdate: true,
    },
  )

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      if (reducedMotion || !isPlaying) {
        gsap.to(root, {
          '--hero-player-glow-opacity': 0.1,
          '--hero-player-glow-scale': 1,
          duration: reducedMotion ? 0 : 0.22,
          ease: 'power2.out',
          overwrite: 'auto',
        })
        return
      }

      gsap.fromTo(
        root,
        {
          '--hero-player-glow-opacity': 0.1,
          '--hero-player-glow-scale': 1,
        },
        {
          '--hero-player-glow-opacity': 0.18,
          '--hero-player-glow-scale': 1.035,
          duration: 1.6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          overwrite: 'auto',
        },
      )
    },
    {
      scope: rootRef,
      dependencies: [isPlaying, reducedMotion],
      revertOnUpdate: true,
    },
  )

  if (!current) return null

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <section
      ref={rootRef}
      className="hero-music-player"
      aria-label="头图音乐播放器"
    >
      <div className="hero-music-player__track">
        <div className="hero-music-player__meta">
          <strong title={current.title}>{current.title}</strong>
          <span>{`${formatTime(currentTime)} / ${formatTime(duration)}`}</span>
        </div>
        <input
          aria-label="播放进度"
          className="hero-music-player__range hero-music-player__progress"
          max={duration || 0}
          min="0"
          step="1"
          type="range"
          value={Math.min(currentTime, duration || 0)}
          style={
            {
              '--range-progress': `${Math.min(progressPercent, 100)}%`,
            } as CSSProperties
          }
          onChange={(event) => seek(Number(event.target.value))}
        />
      </div>
      <div className="hero-music-player__controls">
        <button aria-label="上一首" type="button" onClick={previous}>
          <SkipBack size={18} />
        </button>
        <button
          aria-label={isPlaying ? '暂停' : '播放'}
          className="hero-music-player__play"
          type="button"
          onClick={togglePlayback}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button aria-label="下一首" type="button" onClick={next}>
          <SkipForward size={18} />
        </button>
        <div className="hero-music-player__volume">
          <Volume2 aria-hidden="true" size={18} />
          <input
            aria-label="音量"
            className="hero-music-player__range"
            max="1"
            min="0"
            step="0.05"
            type="range"
            value={volume}
            style={{ '--range-progress': `${volume * 100}%` } as CSSProperties}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </div>
      </div>
    </section>
  )
}
