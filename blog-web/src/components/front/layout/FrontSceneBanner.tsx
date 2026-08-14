import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

type Props = {
  className: string
  children?: ReactNode
  media?: ReactNode
  stationLabel?: string
  rootRef?: RefObject<HTMLElement | null>
}

export const FrontSceneBanner = ({
  className,
  children,
  media,
  stationLabel,
  rootRef,
}: Props) => {
  const waveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wave = waveRef.current
    if (!wave || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      wave.classList.toggle('front-wave-paused', !entry.isIntersecting)
    })
    observer.observe(wave)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={rootRef} className={`front-scene-banner ${className}`}>
      <div
        className={`front-scene-banner__media ${stationLabel ? 'front-scene-banner__media--station' : ''}`}
        role={stationLabel ? 'img' : undefined}
        aria-label={stationLabel}
      >
        {media}
      </div>
      {stationLabel ? <div className="front-scene-banner__wash" /> : null}
      {children}
      <div
        ref={waveRef}
        className="front-scene-banner__wave"
        aria-hidden="true"
      />
    </section>
  )
}
