import type { ReactNode, RefObject } from 'react'

type Props = {
  className: string
  children?: ReactNode
  media?: ReactNode
  mediaRef?: RefObject<HTMLDivElement | null>
  stationLabel?: string
  rootRef?: RefObject<HTMLElement | null>
}

export const FrontSceneBanner = ({
  className,
  children,
  media,
  mediaRef,
  stationLabel,
  rootRef,
}: Props) => (
  <section ref={rootRef} className={`front-scene-banner ${className}`}>
    <div
      ref={mediaRef}
      className={`front-scene-banner__media ${stationLabel ? 'front-scene-banner__media--station' : ''}`}
      role={stationLabel ? 'img' : undefined}
      aria-label={stationLabel}
    >
      {media}
    </div>
    {stationLabel ? <div className="front-scene-banner__wash" /> : null}
    {children}
    <div className="front-scene-banner__wave" aria-hidden="true" />
  </section>
)
