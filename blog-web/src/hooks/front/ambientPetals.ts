import { useEffect, type RefObject } from 'react'

import { frontIllustrationAssets } from '@/components/front/visual/frontAssets'

type Petal = {
  x: number
  y: number
  size: number
  speed: number
  drift: number
  rotation: number
  spin: number
  phase: number
}

const createPetals = (width: number, height: number) => {
  const count = width < 768 ? 6 : 15
  return Array.from<unknown, Petal>({ length: count }, (_, index) => ({
    x: (width / count) * index + Math.random() * 48,
    y: Math.random() * height,
    size: 12 + Math.random() * 11,
    speed: 0.22 + Math.random() * 0.34,
    drift: 0.16 + Math.random() * 0.18,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.014,
    phase: Math.random() * Math.PI * 2,
  }))
}

class AmbientPetalRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly image = new Image()
  private frame: number | null = null
  private width = window.innerWidth
  private height = window.innerHeight
  private readingColumnStart = 0
  private readingColumnEnd = 0
  private readingTriggerLine = 0
  private petals = createPetals(this.width, this.height)

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    this.canvas = canvas
    this.context = context
    this.image.addEventListener('load', this.start)
    this.image.src = frontIllustrationAssets.singlePetal
    this.resize()
    this.start()
  }

  resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = Math.ceil(this.width * ratio)
    this.canvas.height = Math.ceil(this.height * ratio)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0)
    this.readingColumnStart = this.width * 0.18
    this.readingColumnEnd = this.width * 0.82
    this.readingTriggerLine = this.height * 0.42
    this.petals = createPetals(this.width, this.height)
  }

  start = () => {
    if (this.frame !== null || document.hidden || this.image.naturalWidth === 0)
      return
    this.frame = window.requestAnimationFrame(this.render)
  }

  stop = () => {
    if (this.frame === null) return
    window.cancelAnimationFrame(this.frame)
    this.frame = null
  }

  destroy() {
    this.stop()
    this.image.removeEventListener('load', this.start)
    this.context.clearRect(0, 0, this.width, this.height)
  }

  private render = () => {
    if (document.hidden) {
      this.frame = null
      return
    }

    this.context.clearRect(0, 0, this.width, this.height)
    const readingAreaVisible = window.scrollY > this.readingTriggerLine
    for (const petal of this.petals) {
      petal.y += petal.speed
      petal.phase += 0.008
      petal.x += Math.sin(petal.phase) * petal.drift
      petal.rotation += petal.spin
      if (petal.y > this.height + petal.size) {
        petal.y = -petal.size
        petal.x = Math.random() * this.width
      }

      const overReadingColumn =
        readingAreaVisible &&
        petal.x > this.readingColumnStart &&
        petal.x < this.readingColumnEnd
      this.context.globalAlpha = overReadingColumn ? 0.11 : 0.48
      this.context.save()
      this.context.translate(petal.x, petal.y)
      this.context.rotate(petal.rotation)
      this.context.drawImage(
        this.image,
        -petal.size / 2,
        -petal.size / 2,
        petal.size,
        petal.size,
      )
      this.context.restore()
    }
    this.context.globalAlpha = 1
    this.frame = window.requestAnimationFrame(this.render)
  }
}

export const useAmbientPetals = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
) => {
  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const renderer = new AmbientPetalRenderer(canvas, context)
    const handleVisibility = () => {
      if (document.hidden) renderer.stop()
      else renderer.start()
    }
    window.addEventListener('resize', renderer.resize)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('resize', renderer.resize)
      document.removeEventListener('visibilitychange', handleVisibility)
      renderer.destroy()
    }
  }, [canvasRef, enabled])
}
