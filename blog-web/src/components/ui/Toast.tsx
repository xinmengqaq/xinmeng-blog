import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import './ui.css'

gsap.registerPlugin(useGSAP)

export type ToastType = 'success' | 'error'

type ToastProps = {
  message: string | null | undefined
  type: ToastType
  duration?: number
  signal?: unknown
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 5000,
  error: 9000,
}

export const Toast = ({ message, type, duration, signal }: ToastProps) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState(message ?? '')
  const [rendered, setRendered] = useState(Boolean(message))
  const [visible, setVisible] = useState(Boolean(message))
  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }

    setContent(message)
    setRendered(true)
    setVisible(true)
    const timer = window.setTimeout(
      () => setVisible(false),
      duration ?? DEFAULT_DURATION[type],
    )
    return () => window.clearTimeout(timer)
  }, [duration, message, signal, type])

  useGSAP(
    () => {
      if (!rendered || !rootRef.current) return
      if (reducedMotion) {
        gsap.set(rootRef.current, { autoAlpha: visible ? 1 : 0 })
        if (!visible) setRendered(false)
        return
      }

      gsap.fromTo(
        rootRef.current,
        visible
          ? { autoAlpha: 0, y: -12, scale: 0.98 }
          : { autoAlpha: 1, y: 0, scale: 1 },
        visible
          ? {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.22,
              ease: 'power2.out',
              overwrite: 'auto',
            }
          : {
              autoAlpha: 0,
              y: -8,
              scale: 0.99,
              duration: 0.16,
              ease: 'power1.in',
              overwrite: 'auto',
              onComplete: () => setRendered(false),
            },
      )
    },
    {
      dependencies: [reducedMotion, rendered, visible],
      revertOnUpdate: true,
      scope: rootRef,
    },
  )

  if (!rendered) return null

  const Icon = type === 'success' ? CircleCheck : CircleAlert

  return createPortal(
    <div
      aria-atomic="true"
      className={`ui-toast ui-toast--${type}`}
      ref={rootRef}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" className="ui-toast__status-icon" />
      <span className="ui-toast__message">{content}</span>
      <button
        aria-label="关闭提示"
        className="ui-toast__close"
        onClick={() => setVisible(false)}
        type="button"
      >
        <X aria-hidden="true" />
      </button>
    </div>,
    document.body,
  )
}
