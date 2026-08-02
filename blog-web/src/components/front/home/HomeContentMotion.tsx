import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef, type ReactNode } from 'react'

import { useFrontMotionPreference } from '@/hooks/front/motionPreference'

gsap.registerPlugin(useGSAP, ScrollTrigger)

type Props = {
  children: ReactNode
  featuredCount: number
  latestCount: number
}

export const HomeContentMotion = ({
  children,
  featuredCount,
  latestCount,
}: Props) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const { motionAllowed } = useFrontMotionPreference()

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current
      if (!root) return

      const featured = root.querySelector<HTMLElement>('.home-featured')
      const latestRows = gsap.utils.toArray<HTMLElement>(
        '.home-latest__row',
        root,
      )
      const allContent = gsap.utils.toArray<HTMLElement>(
        '.home-featured__anchor, .home-featured__index-item, .home-latest__row',
        root,
      )

      if (!motionAllowed) {
        gsap.set(allContent, { clearProps: 'all' })
        return
      }

      let pointerAnimations: ReturnType<typeof gsap.matchMedia> | null = null

      if (featured) {
        const anchor = featured.querySelector<HTMLElement>(
          '.home-featured__anchor',
        )
        const indexItems = gsap.utils.toArray<HTMLElement>(
          '.home-featured__index-item',
          featured,
        )
        const anchorMedia = anchor?.querySelector<HTMLElement>(
          '.home-featured__anchor-media',
        )
        const anchorCopy = anchor?.querySelector<HTMLElement>(
          '.home-featured__anchor-copy',
        )
        const indexMedia = gsap.utils.toArray<HTMLElement>(
          '.home-featured__index-media',
          featured,
        )
        const indexCopy = gsap.utils.toArray<HTMLElement>(
          '.home-featured__index-copy',
          featured,
        )
        const timeline = gsap.timeline({
          defaults: { duration: 0.56, ease: 'power3.out' },
          scrollTrigger: {
            trigger: featured,
            start: 'clamp(top 82%)',
            once: true,
          },
        })

        if (anchor) {
          timeline.fromTo(
            anchor,
            { autoAlpha: 0, y: 20, scale: 0.985 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.72,
              clearProps: 'transform,opacity,visibility',
            },
            0.08,
          )
        }
        if (anchorMedia) {
          timeline.fromTo(
            anchorMedia,
            { autoAlpha: 0.72, scale: 1.018 },
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.78,
              clearProps: 'transform,opacity,visibility',
            },
            0.1,
          )
        }
        if (anchorCopy) {
          timeline.fromTo(
            anchorCopy,
            { autoAlpha: 0, y: 14 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.58,
              clearProps: 'transform,opacity,visibility',
            },
            0.18,
          )
        }
        if (indexItems.length > 0) {
          timeline.fromTo(
            indexItems,
            { autoAlpha: 0, y: 18, scale: 0.992 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.62,
              stagger: 0.09,
              clearProps: 'transform,opacity,visibility',
            },
            0.28,
          )
        }
        if (indexMedia.length > 0) {
          timeline.fromTo(
            indexMedia,
            { autoAlpha: 0.72, scale: 1.025 },
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.72,
              stagger: 0.09,
              clearProps: 'transform,opacity,visibility',
            },
            0.31,
          )
        }
        if (indexCopy.length > 0) {
          timeline.fromTo(
            indexCopy,
            { autoAlpha: 0, y: 9 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.5,
              stagger: 0.09,
              clearProps: 'transform,opacity,visibility',
            },
            0.36,
          )
        }

        const proximityTargets = [...(anchor ? [anchor] : []), ...indexItems]
        const proximityMedia = proximityTargets.map((target) =>
          target.querySelector<HTMLElement>(
            '.home-featured__anchor-media, .home-featured__index-media',
          ),
        )
        const proximityCopy = proximityTargets.map((target) =>
          target.querySelector<HTMLElement>(
            '.home-featured__anchor-copy, .home-featured__index-copy',
          ),
        )
        const mediaTargets = proximityMedia.filter(
          (target): target is HTMLElement => target != null,
        )
        const copyTargets = proximityCopy.filter(
          (target): target is HTMLElement => target != null,
        )
        const anchorLayerSpecs = anchor
          ? [
              {
                target: anchor.querySelector<HTMLElement>(
                  '.home-featured__anchor-heading',
                ),
                y: -7,
                scale: 1.006,
              },
              {
                target: anchor.querySelector<HTMLElement>(
                  '.home-featured__anchor-copy > p',
                ),
                y: -4,
                scale: 1.003,
              },
              {
                target: anchor.querySelector<HTMLElement>(
                  '.home-featured__anchor-copy > .front-meta',
                ),
                y: -2,
                scale: 1.002,
              },
            ].filter(
              (
                layer,
              ): layer is {
                target: HTMLElement
                y: number
                scale: number
              } => layer.target != null,
            )
          : []
        pointerAnimations = gsap.matchMedia()

        pointerAnimations.add(
          '(hover: hover) and (pointer: fine)',
          () => {
            const controllers = proximityTargets.map((target, index) => {
              const media = proximityMedia[index]
              const copy = proximityCopy[index]
              const isAnchor = target.classList.contains(
                'home-featured__anchor',
              )
              return {
                target,
                isAnchor,
                mediaScaleTo: media
                  ? gsap.quickTo(media, 'scale', {
                      duration: 0.5,
                      ease: 'power3.out',
                    })
                  : null,
                mediaYTo: media
                  ? gsap.quickTo(media, 'y', {
                      duration: 0.42,
                      ease: 'power3.out',
                    })
                  : null,
                copyYTo:
                  copy && !isAnchor
                    ? gsap.quickTo(copy, 'y', {
                        duration: 0.38,
                        ease: 'power3.out',
                      })
                    : null,
                copyScaleTo:
                  copy && !isAnchor
                    ? gsap.quickTo(copy, 'scale', {
                        duration: 0.42,
                        ease: 'power3.out',
                      })
                    : null,
              }
            })
            const anchorLayerControllers = anchorLayerSpecs.map((layer) => ({
              ...layer,
              yTo: gsap.quickTo(layer.target, 'y', {
                duration: 0.38,
                ease: 'power3.out',
              }),
              scaleTo: gsap.quickTo(layer.target, 'scale', {
                duration: 0.42,
                ease: 'power3.out',
              }),
            }))
            const clampStrength = gsap.utils.clamp(0, 1)
            const applyStrength = (index: number, strength: number) => {
              const controller = controllers[index]
              if (!controller) return
              controller.mediaYTo?.(controller.isAnchor ? 0 : -3 * strength)
              controller.mediaScaleTo?.(
                1 + (controller.isAnchor ? 0.012 : 0.018) * strength,
              )
              controller.copyYTo?.(controller.isAnchor ? 0 : -10 * strength)
              controller.copyScaleTo?.(
                controller.isAnchor ? 1 : 1 + 0.01 * strength,
              )
              if (controller.isAnchor) {
                anchorLayerControllers.forEach((layer) => {
                  layer.yTo(layer.y * strength)
                  layer.scaleTo(1 + (layer.scale - 1) * strength)
                })
              }
            }
            const reset = () => {
              controllers.forEach((_, index) => applyStrength(index, 0))
            }
            const onPointerMove = contextSafe!((event: PointerEvent) => {
              const rects = proximityTargets.map((target) =>
                target.getBoundingClientRect(),
              )
              rects.forEach((rect, index) => {
                const dx = Math.max(
                  rect.left - event.clientX,
                  0,
                  event.clientX - rect.right,
                )
                const dy = Math.max(
                  rect.top - event.clientY,
                  0,
                  event.clientY - rect.bottom,
                )
                const distance = Math.hypot(dx, dy)
                applyStrength(index, clampStrength(1 - distance / 140))
              })
            })
            const onPointerLeave = contextSafe!(reset)
            const onFocusIn = contextSafe!((event: FocusEvent) => {
              const focused = (event.target as Element | null)?.closest(
                '.home-featured__anchor, .home-featured__index-item',
              )
              controllers.forEach((controller, index) =>
                applyStrength(index, controller.target === focused ? 1 : 0),
              )
            })
            const onFocusOut = contextSafe!((event: FocusEvent) => {
              if (!featured.contains(event.relatedTarget as Node | null)) {
                reset()
              }
            })

            featured.addEventListener('pointermove', onPointerMove)
            featured.addEventListener('pointerleave', onPointerLeave)
            featured.addEventListener('focusin', onFocusIn)
            featured.addEventListener('focusout', onFocusOut)

            return () => {
              featured.removeEventListener('pointermove', onPointerMove)
              featured.removeEventListener('pointerleave', onPointerLeave)
              featured.removeEventListener('focusin', onFocusIn)
              featured.removeEventListener('focusout', onFocusOut)
              gsap.killTweensOf([
                ...proximityTargets,
                ...mediaTargets,
                ...copyTargets,
                ...anchorLayerSpecs.map((layer) => layer.target),
              ])
            }
          },
          featured,
        )
      }

      latestRows.forEach((row) => {
        gsap.fromTo(
          row,
          { autoAlpha: 0, y: 20 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.52,
            ease: 'power2.out',
            clearProps: 'transform,opacity,visibility',
            scrollTrigger: {
              trigger: row,
              start: 'clamp(top 88%)',
              once: true,
            },
          },
        )
      })

      let active = true
      void document.fonts.ready.then(() => {
        if (active) {
          ScrollTrigger.refresh()
        }
      })
      return () => {
        active = false
        pointerAnimations?.revert()
      }
    },
    {
      scope: rootRef,
      dependencies: [motionAllowed, featuredCount, latestCount],
      revertOnUpdate: true,
    },
  )

  return <div ref={rootRef}>{children}</div>
}
