import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState } from 'react'

import { FrontSceneBanner } from '@/components/front/layout/FrontSceneBanner'
import { HeroMusicPlayer } from './HeroMusicPlayer'
import { FrontSiteBackground } from '@/components/front/layout/FrontSiteBackground'
import {
  FrontAssetImage,
  FrontBrandMark,
  FrontIcon,
} from '@/components/front/visual'
import { frontSite } from '@/config/frontSite'
import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { useFrontPageTransitionActive } from '@/hooks/front/pageTransitionContext'
import {
  type HomeIntroNodes,
  playHomeIntro,
  shouldPlayHomeIntro,
  showHomeIntroFinal,
} from './homeStationIntro'

gsap.registerPlugin(useGSAP)

const titleParticleIndexes = Array.from({ length: 7 }, (_, index) => index)

export const HomeStationHero = () => {
  const rootRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLSpanElement>(null)
  const stationRef = useRef<HTMLSpanElement>(null)
  const markRef = useRef<HTMLSpanElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const welcomeRef = useRef<HTMLParagraphElement>(null)
  const messageRef = useRef<HTMLButtonElement>(null)
  const clockRef = useRef<HTMLDivElement>(null)
  const titleParticleRefs = useRef<Array<HTMLSpanElement | null>>([])
  const [line, setLine] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const { motionAllowed } = useFrontMotionPreference()
  const pageTransitionActive = useFrontPageTransitionActive()

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const greeting =
    now.getHours() < 12
      ? '晨光初醒，愿你今日从容'
      : now.getHours() < 18
        ? '午后风轻，云影缓行'
        : '夜色渐深，灯火可亲'
  const time = useMemo(
    () =>
      now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    [now],
  )
  const stationLine = frontSite.stationLines[line]

  useGSAP(
    () => {
      const values = {
        rail: railRef.current,
        station: stationRef.current,
        mark: markRef.current,
        title: titleRef.current,
        welcome: welcomeRef.current,
        message: messageRef.current,
        clock: clockRef.current,
        titleParticles: titleParticleRefs.current.filter(
          (particle): particle is HTMLSpanElement => particle !== null,
        ),
      }
      if (
        Object.entries(values)
          .filter(([key]) => key !== 'titleParticles')
          .some(([, value]) => value === null)
      )
        return
      const nodes = values as HomeIntroNodes
      if (pageTransitionActive) return
      if (!shouldPlayHomeIntro(motionAllowed)) {
        showHomeIntroFinal(nodes)
        return
      }
      const timeline = playHomeIntro(nodes)

      return () => timeline.kill()
    },
    {
      scope: rootRef,
      dependencies: [motionAllowed, pageTransitionActive],
      revertOnUpdate: true,
    },
  )

  return (
    <FrontSceneBanner
      className="station-hero"
      media={<FrontSiteBackground />}
      stationLabel={frontSite.stationFallback}
      rootRef={rootRef}
    >
      <div className="front-container station-hero__content">
        <div className="station-hero__identity">
          <span className="station-hero__brand-reveal">
            <span
              className="station-hero__reveal-rail"
              ref={railRef}
              aria-hidden="true"
            />
            <span
              className="station-hero__reveal-station"
              ref={stationRef}
              aria-hidden="true"
            />
            <span className="station-hero__mark-shell" ref={markRef}>
              <FrontBrandMark graphicOnly className="station-hero__mark" />
            </span>
          </span>
          <h1 ref={titleRef}>
            <span className="station-hero__title-text">{frontSite.name}</span>
          </h1>
          <span className="station-hero__title-particles" aria-hidden="true">
            {titleParticleIndexes.map((index) => (
              <span
                className={`station-hero__title-particle station-hero__title-particle--${index + 1}`}
                key={index}
                ref={(node) => {
                  titleParticleRefs.current[index] = node
                }}
              />
            ))}
          </span>
          <p className="station-hero__welcome" ref={welcomeRef}>
            <span>{frontSite.welcome}</span>
          </p>
        </div>

        <div className="station-hero__status">
          <button
            ref={messageRef}
            className="station-message"
            type="button"
            aria-label={`每日短句：${stationLine}。点击换一句`}
            onClick={() =>
              setLine((value) => (value + 1) % frontSite.stationLines.length)
            }
          >
            <FrontAssetImage
              className="station-message__seal"
              name="stationSeal"
            />
            <span className="station-message__text" aria-live="polite">
              {stationLine}
            </span>
            <FrontIcon name="retry" size={16} />
          </button>

          <div
            ref={clockRef}
            className="station-clock"
            aria-label={`当前时间 ${time}，${greeting}`}
          >
            <FrontIcon name="readingTime" size={24} />
            <strong>{time}</strong>
            <span>{greeting}</span>
          </div>
        </div>
      </div>
      <HeroMusicPlayer />
    </FrontSceneBanner>
  )
}
