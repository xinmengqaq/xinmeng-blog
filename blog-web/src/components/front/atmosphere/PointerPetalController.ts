import gsap from 'gsap'

type PointerPetalElements = {
  follower: HTMLImageElement
  trail: HTMLSpanElement[]
  particles: HTMLSpanElement[]
}

const EDITABLE_TARGETS =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
const INTERACTIVE_TARGETS = 'a, button, summary, [role="button"]'
const NATIVE_CURSOR_VALUES = new Set([
  'text',
  'vertical-text',
  'grab',
  'grabbing',
  'col-resize',
  'row-resize',
  'n-resize',
  'e-resize',
  's-resize',
  'w-resize',
  'ne-resize',
  'nw-resize',
  'se-resize',
  'sw-resize',
  'ew-resize',
  'ns-resize',
  'nesw-resize',
  'nwse-resize',
])

const asElement = (target: EventTarget | null) =>
  target instanceof Element ? target : null

export class PointerPetalController {
  private readonly follower: HTMLImageElement
  private readonly trail: HTMLSpanElement[]
  private readonly particles: HTMLSpanElement[]
  private readonly all: Array<HTMLImageElement | HTMLSpanElement>
  private readonly followerRotation: ReturnType<typeof gsap.quickTo>
  private readonly trailProxy = { x: 0, y: 0 }
  private readonly trailX: ReturnType<typeof gsap.quickTo>
  private readonly trailY: ReturnType<typeof gsap.quickTo>
  private readonly tickTrail: () => void
  private followerVisible = false
  private interactive = false
  private pressed = false
  private dragging = false
  private dragStartX = 0
  private dragStartY = 0
  private lastX = 0
  private hasPosition = false
  private previousTrailX = 0
  private previousTrailY = 0
  private trailDistance = 0
  private nextTrailParticle = 0
  private nextParticle = 0

  constructor({ follower, trail, particles }: PointerPetalElements) {
    this.follower = follower
    this.trail = trail
    this.particles = particles
    this.all = [follower, ...trail, ...particles]
    this.followerRotation = gsap.quickTo(follower, 'rotation', {
      duration: 0.16,
      ease: 'power2.out',
    })
    this.trailX = gsap.quickTo(this.trailProxy, 'x', {
      duration: 0.16,
      ease: 'power3.out',
    })
    this.trailY = gsap.quickTo(this.trailProxy, 'y', {
      duration: 0.16,
      ease: 'power3.out',
    })
    this.tickTrail = () => this.updateTrail()
    gsap.ticker.add(this.tickTrail)
    document.documentElement.classList.add('front-custom-cursor')
  }

  move(event: PointerEvent) {
    if (
      this.pressed &&
      Math.hypot(
        event.clientX - this.dragStartX,
        event.clientY - this.dragStartY,
      ) > 5
    ) {
      this.dragging = true
    }
    if (this.isSuppressed(event.target)) {
      this.setNativeCursor(true)
      this.hide()
      return
    }
    this.setNativeCursor(false)

    const hadPosition = this.hasPosition
    const deltaX = hadPosition ? event.clientX - this.lastX : 0
    if (!hadPosition) {
      this.trailProxy.x = event.clientX
      this.trailProxy.y = event.clientY
      this.previousTrailX = event.clientX
      this.previousTrailY = event.clientY
    } else {
      this.trailX(event.clientX)
      this.trailY(event.clientY)
    }
    this.lastX = event.clientX
    this.hasPosition = true

    gsap.set(this.follower, { x: event.clientX - 5, y: event.clientY - 1 })
    this.followerRotation(gsap.utils.clamp(-5, 5, deltaX * 0.32))

    const interactive = Boolean(
      asElement(event.target)?.closest(INTERACTIVE_TARGETS),
    )
    this.setInteractive(interactive)
    this.setFollowerVisible(true)
  }

  down(event: PointerEvent) {
    if (event.button !== 0 || this.isSuppressed(event.target)) return
    this.pressed = true
    this.dragging = false
    this.dragStartX = event.clientX
    this.dragStartY = event.clientY
    this.lastX = event.clientX
    this.hasPosition = true
    this.trailProxy.x = event.clientX
    this.trailProxy.y = event.clientY
    this.previousTrailX = event.clientX
    this.previousTrailY = event.clientY
    this.setNativeCursor(false)
    gsap.set(this.follower, { x: event.clientX - 5, y: event.clientY - 1 })
    this.setFollowerVisible(true)
    gsap.to(this.follower, { scale: 0.88, duration: 0.08, ease: 'power2.out' })
  }

  up(event: PointerEvent) {
    const shouldBurst =
      this.pressed && !this.dragging && !this.isSuppressed(event.target)
    this.pressed = false
    this.dragging = false
    gsap.to(this.follower, {
      scale: this.interactive ? 1.06 : 1,
      duration: 0.18,
    })
    if (shouldBurst) this.burst(event)
  }

  cancel() {
    this.pressed = false
    this.dragging = false
    if (document.hidden) {
      this.setNativeCursor(true)
      this.hide()
    }
  }

  selectionChange() {
    if (this.hasTextSelection()) {
      this.setNativeCursor(true)
      this.hide()
    }
  }

  pointerOut(event: PointerEvent) {
    if (event.relatedTarget === null) this.deactivate()
  }

  deactivate() {
    this.cancel()
    this.setNativeCursor(true)
    this.hide()
    this.hasPosition = false
    this.trailDistance = 0
  }

  destroy() {
    gsap.ticker.remove(this.tickTrail)
    gsap.killTweensOf(this.trailProxy)
    gsap.killTweensOf(this.all)
    gsap.set(this.all, { autoAlpha: 0 })
    document.documentElement.classList.remove(
      'front-custom-cursor',
      'front-native-cursor',
    )
  }

  private isSuppressed(target: EventTarget | null) {
    return (
      document.hidden ||
      this.dragging ||
      this.hasTextSelection() ||
      Boolean(asElement(target)?.closest(EDITABLE_TARGETS)) ||
      this.requiresNativeCursor(target)
    )
  }

  private hasTextSelection() {
    return window.getSelection()?.type === 'Range'
  }

  private hide() {
    this.setFollowerVisible(false)
  }

  private setFollowerVisible(visible: boolean) {
    if (visible === this.followerVisible) return
    this.followerVisible = visible
    gsap.killTweensOf(this.follower, 'opacity,visibility')
    gsap.to(this.follower, {
      autoAlpha: visible ? 1 : 0,
      duration: visible ? 0.08 : 0.1,
    })
    if (!visible) {
      gsap.killTweensOf(this.trailProxy)
      gsap.killTweensOf(this.trail)
      gsap.set(this.trail, { autoAlpha: 0 })
      this.hasPosition = false
      this.trailDistance = 0
    }
  }

  private setInteractive(interactive: boolean) {
    if (interactive === this.interactive) return
    this.interactive = interactive
    gsap.to(this.follower, {
      scale: interactive ? 1.06 : 1,
      yPercent: interactive ? -3 : 0,
      duration: 0.18,
      ease: 'power2.out',
    })
  }

  private requiresNativeCursor(target: EventTarget | null) {
    const element = asElement(target)
    return element
      ? NATIVE_CURSOR_VALUES.has(window.getComputedStyle(element).cursor)
      : false
  }

  private setNativeCursor(native: boolean) {
    document.documentElement.classList.toggle('front-native-cursor', native)
  }

  private updateTrail() {
    if (!this.hasPosition || !this.followerVisible || this.dragging) return
    const currentX = this.trailProxy.x
    const currentY = this.trailProxy.y
    if (
      Math.hypot(
        currentX - this.previousTrailX,
        currentY - this.previousTrailY,
      ) < 0.18
    )
      return

    this.emitTrail(this.previousTrailX, this.previousTrailY, currentX, currentY)
    this.previousTrailX = currentX
    this.previousTrailY = currentY
  }

  private emitTrail(fromX: number, fromY: number, toX: number, toY: number) {
    const deltaX = toX - fromX
    const deltaY = toY - fromY
    const distance = Math.hypot(deltaX, deltaY)
    const directionX = deltaX / distance
    const directionY = deltaY / distance
    const spacing = 7
    this.trailDistance += distance

    let emitted = 0
    while (this.trailDistance >= spacing && emitted < 4) {
      this.trailDistance -= spacing
      emitted += 1
      const progress = 1 - this.trailDistance / distance
      const particle = this.trail[this.nextTrailParticle]
      this.nextTrailParticle = (this.nextTrailParticle + 1) % this.trail.length
      const side = this.nextTrailParticle % 2 === 0 ? -1 : 1
      const spread = gsap.utils.random(1.5, 5) * side
      const startX = fromX + deltaX * progress - directionY * spread
      const startY = fromY + deltaY * progress + directionX * spread
      const glide = gsap.utils.random(10, 24)

      gsap.killTweensOf(particle)
      gsap.set(particle, {
        x: startX,
        y: startY,
        scale: 0.2,
        autoAlpha: 0,
      })
      gsap.to(particle, {
        keyframes: [
          {
            scale: gsap.utils.random(0.72, 1.18),
            autoAlpha: this.interactive ? 1 : 0.86,
            duration: 0.1,
            ease: 'sine.out',
          },
          {
            x: startX + directionX * glide - directionY * spread * 0.5,
            y: startY + directionY * glide + directionX * spread * 0.5,
            scale: 0.12,
            autoAlpha: 0,
            duration: gsap.utils.random(0.38, 0.56),
            ease: 'sine.out',
          },
        ],
      })
    }
  }

  private burst(event: PointerEvent) {
    const count = gsap.utils.random(6, 8, 1)
    for (let index = 0; index < count; index += 1) {
      const particle = this.particles[this.nextParticle]
      this.nextParticle = (this.nextParticle + 1) % this.particles.length
      const angle =
        ((index / count) * 360 + gsap.utils.random(-18, 18)) * (Math.PI / 180)
      const distance = gsap.utils.random(24, 48)
      gsap.killTweensOf(particle)
      gsap.set(particle, {
        x: event.clientX - 3,
        y: event.clientY - 3,
        rotation: gsap.utils.random(0, 90),
        scale: gsap.utils.random(0.72, 1.08),
        autoAlpha: 0.94,
      })
      gsap.to(particle, {
        x: event.clientX + Math.cos(angle) * distance,
        y: event.clientY + Math.sin(angle) * distance + 8,
        rotation: `+=${gsap.utils.random(-120, 120)}`,
        scale: 0.2,
        autoAlpha: 0,
        duration: gsap.utils.random(0.36, 0.52),
        ease: 'power3.out',
      })
    }
  }
}
