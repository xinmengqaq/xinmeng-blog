import { useEffect, useState, type RefObject } from 'react'

export const calculateReadingProgress = (
  articleTop: number,
  documentHeight: number,
  viewportHeight: number,
  scrollY: number,
) => {
  const pageBottom = Math.max(0, documentHeight - viewportHeight)
  if (scrollY >= pageBottom) return 100
  if (scrollY <= articleTop) return 0
  const distance = Math.max(0, pageBottom - articleTop)
  if (distance === 0) return 0
  return Math.min(99, Math.max(0, ((scrollY - articleTop) / distance) * 100))
}

export const useReadingProgress = (ref: RefObject<HTMLElement | null>) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const element = ref.current
        if (!element) return
        const top = element.getBoundingClientRect().top + window.scrollY
        setProgress(
          calculateReadingProgress(
            top,
            document.documentElement.scrollHeight,
            window.innerHeight,
            window.scrollY,
          ),
        )
      })
    }
    update()
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(document.documentElement)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ref])

  return progress
}
