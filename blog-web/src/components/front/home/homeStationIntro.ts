import gsap from 'gsap'

let homeIntroHasPlayed = false

const titleParticleMotion = {
  autoAlpha: gsap.utils.wrap([0.78, 0.48, 0.7, 0.56, 0.42, 0.62, 0.36]),
  x: gsap.utils.wrap([18, 12, 25, 16, 22, 10, 14]),
  y: gsap.utils.wrap([-9, 6, -5, 10, -12, 4, 12]),
  scale: gsap.utils.wrap([1, 0.66, 0.84, 0.72, 0.58, 0.76, 0.52]),
}

export type HomeIntroNodes = {
  rail: HTMLSpanElement
  station: HTMLSpanElement
  mark: HTMLSpanElement
  title: HTMLHeadingElement
  welcome: HTMLParagraphElement
  message: HTMLButtonElement
  clock: HTMLDivElement
  titleParticles: HTMLSpanElement[]
}

const allNodes = (nodes: HomeIntroNodes) => [
  nodes.rail,
  nodes.station,
  nodes.mark,
  nodes.title,
  nodes.welcome,
  nodes.message,
  nodes.clock,
  ...nodes.titleParticles,
]

export const clearHomeIntro = (nodes: HomeIntroNodes) => {
  gsap.set(allNodes(nodes), {
    clearProps: 'transform,opacity,visibility,will-change,transition',
  })
}

export const shouldPlayHomeIntro = (motionAllowed: boolean) => {
  if (!motionAllowed) homeIntroHasPlayed = true
  return motionAllowed && !homeIntroHasPlayed
}

export const showHomeIntroFinal = (nodes: HomeIntroNodes) => {
  gsap.killTweensOf(allNodes(nodes))
  clearHomeIntro(nodes)
}

export const playHomeIntro = (nodes: HomeIntroNodes) => {
  gsap.set(nodes.rail, {
    autoAlpha: 0,
    scaleX: 0,
    transformOrigin: 'left center',
  })
  gsap.set(nodes.station, { autoAlpha: 0, scale: 0.55 })
  gsap.set(nodes.mark, { autoAlpha: 0, scale: 0.92 })
  gsap.set([nodes.title, nodes.welcome, nodes.message, nodes.clock], {
    autoAlpha: 0,
    y: 9,
  })
  gsap.set(nodes.titleParticles, {
    autoAlpha: 0,
    x: 0,
    y: 0,
    scale: 0.55,
    willChange: 'transform, opacity',
  })

  const timeline = gsap.timeline({
    defaults: { ease: 'power2.out' },
    onComplete: () => {
      homeIntroHasPlayed = true
      clearHomeIntro(nodes)
    },
  })

  timeline
    .addLabel('brandReveal', 0)
    .addLabel('welcomeReveal', 0.68)
    .addLabel('statusReveal', 0.98)
    .addLabel('clockReveal', 1.23)
    .to(
      nodes.rail,
      { autoAlpha: 0.74, scaleX: 1, duration: 0.34 },
      'brandReveal',
    )
    .to(
      nodes.station,
      { autoAlpha: 1, scale: 1, duration: 0.22 },
      'brandReveal+=0.16',
    )
    .to(
      nodes.mark,
      { autoAlpha: 1, scale: 1, duration: 0.34 },
      'brandReveal+=0.22',
    )
    .to(
      nodes.titleParticles,
      {
        ...titleParticleMotion,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power2.out',
      },
      'brandReveal+=0.16',
    )
    .to(
      nodes.titleParticles,
      {
        autoAlpha: 0,
        scale: 0.4,
        duration: 0.4,
        stagger: 0.04,
        ease: 'power1.out',
      },
      'brandReveal+=0.52',
    )
    .to(nodes.title, { autoAlpha: 1, y: 0, duration: 0.3 }, 'brandReveal+=0.28')
    .to(
      [nodes.rail, nodes.station],
      { autoAlpha: 0, duration: 0.2 },
      'brandReveal+=0.46',
    )
    .to(nodes.welcome, { autoAlpha: 1, y: 0, duration: 0.34 }, 'welcomeReveal')
    .to(nodes.message, { autoAlpha: 1, y: 0, duration: 0.36 }, 'statusReveal')
    .to(nodes.clock, { autoAlpha: 1, y: 0, duration: 0.36 }, 'clockReveal')

  return timeline
}
