import { useEffect, useRef } from 'react'

const MIN_THUMB_HEIGHT = 44
const IDLE_DELAY = 650

export const FrontPageScrollbar = () => {
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<number | undefined>(undefined)
  const dragRef = useRef<{
    pointerId: number
    startY: number
    startScrollTop: number
    scrollRange: number
    thumbRange: number
  } | null>(null)

  useEffect(() => {
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!track || !thumb) return

    const desktopPointer = window.matchMedia(
      '(min-width: 768px) and (hover: hover) and (pointer: fine)',
    )

    const updateThumb = () => {
      if (!desktopPointer.matches) {
        track.dataset.scrollable = 'false'
        return
      }

      const root = document.documentElement
      const viewportHeight = root.clientHeight
      const scrollHeight = Math.max(
        root.scrollHeight,
        document.body.scrollHeight,
      )
      const scrollRange = Math.max(0, scrollHeight - viewportHeight)
      const trackHeight = track.clientHeight
      const thumbHeight = Math.max(
        MIN_THUMB_HEIGHT,
        Math.round((viewportHeight / scrollHeight) * trackHeight),
      )
      const thumbRange = Math.max(0, trackHeight - thumbHeight)
      const thumbTop = scrollRange
        ? Math.round((root.scrollTop / scrollRange) * thumbRange)
        : 0

      track.dataset.scrollable = scrollRange > 0 ? 'true' : 'false'
      thumb.style.height = `${Math.min(trackHeight, thumbHeight)}px`
      thumb.style.transform = `translate3d(0, ${thumbTop}px, 0)`
    }

    const showTemporarily = () => {
      if (!desktopPointer.matches) return
      track.classList.add('is-visible')
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = window.setTimeout(() => {
        if (!dragRef.current) track.classList.remove('is-visible')
      }, IDLE_DELAY)
    }

    const handleScroll = () => {
      updateThumb()
      showTemporarily()
    }
    const handleResize = () => updateThumb()
    const resizeObserver = new ResizeObserver(updateThumb)

    updateThumb()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    desktopPointer.addEventListener('change', updateThumb)
    resizeObserver.observe(document.body)

    return () => {
      window.clearTimeout(hideTimerRef.current)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      desktopPointer.removeEventListener('change', updateThumb)
      resizeObserver.disconnect()
    }
  }, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!track || !thumb || track.dataset.scrollable !== 'true') return

    event.preventDefault()
    thumb.setPointerCapture(event.pointerId)
    const root = document.documentElement
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: root.scrollTop,
      scrollRange: Math.max(0, root.scrollHeight - root.clientHeight),
      thumbRange: Math.max(0, track.clientHeight - thumb.offsetHeight),
    }
    track.classList.add('is-dragging', 'is-visible')
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !drag.thumbRange) return

    const nextScrollTop =
      drag.startScrollTop +
      ((event.clientY - drag.startY) / drag.thumbRange) * drag.scrollRange
    document.documentElement.scrollTop = Math.max(
      0,
      Math.min(drag.scrollRange, nextScrollTop),
    )
  }

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag || drag.pointerId !== event.pointerId || !track) return

    dragRef.current = null
    track.classList.remove('is-dragging')
    window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(
      () => track.classList.remove('is-visible'),
      IDLE_DELAY,
    )
  }

  return (
    <div ref={trackRef} className="front-page-scrollbar" aria-hidden="true">
      <div
        ref={thumbRef}
        className="front-page-scrollbar__thumb"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      />
    </div>
  )
}
