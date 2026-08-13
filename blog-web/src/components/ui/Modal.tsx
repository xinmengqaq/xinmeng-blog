import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Button } from './Button'
import './ui.css'

gsap.registerPlugin(useGSAP)

export type ModalCloseReason = 'backdrop' | 'close-button' | 'escape'

type ModalProps = {
  open: boolean
  title: string
  children: ReactNode
  footer?: ReactNode
  onClose: (reason: ModalCloseReason) => void
  closeLabel?: string
  locked?: boolean
  motion?: boolean
  reducedMotion?: boolean
  panelClassName?: string
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export const Modal = ({
  open,
  title,
  children,
  footer,
  onClose,
  closeLabel = '关闭',
  locked = false,
  motion = false,
  reducedMotion = false,
  panelClassName,
}: ModalProps) => {
  const titleId = useId()
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [rendered, setRendered] = useState(open)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setRendered(true), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useGSAP(
    () => {
      if (!rendered || !backdropRef.current || !panelRef.current) {
        return
      }

      if (!motion || reducedMotion) {
        const visibilityVars = open
          ? { autoAlpha: 1, clearProps: 'transform' }
          : { autoAlpha: 0 }
        gsap.set([backdropRef.current, panelRef.current], visibilityVars)
        if (!open) {
          setRendered(false)
        }
        return
      }

      const timeline = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: open ? undefined : () => setRendered(false),
      })
      const mobile = window.matchMedia('(max-width: 767px)').matches
      const startY = mobile ? 16 : 12
      const startScale = mobile ? 1 : 0.985

      if (open) {
        timeline
          .fromTo(
            backdropRef.current,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.22, ease: 'power2.out' },
            0,
          )
          .fromTo(
            panelRef.current,
            { autoAlpha: 0, y: startY, scale: startScale },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.24,
              ease: 'power2.out',
            },
            0,
          )
      } else {
        timeline
          .to(panelRef.current, {
            autoAlpha: 0,
            y: mobile ? 10 : 8,
            scale: mobile ? 1 : 0.99,
            duration: 0.15,
            ease: 'power1.in',
          })
          .to(
            backdropRef.current,
            { autoAlpha: 0, duration: 0.15, ease: 'power1.in' },
            0,
          )
      }
    },
    {
      dependencies: [motion, open, reducedMotion, rendered],
      revertOnUpdate: true,
      scope: modalRef,
    },
  )

  useEffect(() => {
    if (!rendered) {
      return
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousModalHeight = document.documentElement.style.getPropertyValue(
      '--ui-modal-document-height',
    )
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation()
        if (!locked) {
          onClose('escape')
        }
        return
      }

      if (event.key !== 'Tab' || !open || !panelRef.current) {
        return
      }

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.getClientRects().length > 0)

      if (focusableElements.length === 0) {
        event.preventDefault()
        titleRef.current?.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement
      if (
        event.shiftKey &&
        (activeElement === firstElement || activeElement === titleRef.current)
      ) {
        event.preventDefault()
        lastElement.focus()
      } else if (
        !panelRef.current.contains(activeElement) ||
        (!event.shiftKey && activeElement === lastElement)
      ) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      window.innerHeight,
    )

    document.documentElement.style.setProperty(
      '--ui-modal-document-height',
      `${documentHeight}px`,
    )
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      if (previousModalHeight) {
        document.documentElement.style.setProperty(
          '--ui-modal-document-height',
          previousModalHeight,
        )
      } else {
        document.documentElement.style.removeProperty(
          '--ui-modal-document-height',
        )
      }
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [locked, onClose, open, rendered])

  useEffect(() => {
    if (!open || !rendered || !panelRef.current) {
      return
    }

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const initialFocus =
      panelRef.current.querySelector<HTMLElement>(
        '[data-modal-initial-focus]',
      ) ?? titleRef.current
    initialFocus?.focus()
  }, [open, rendered])

  useEffect(() => {
    if (!rendered) {
      returnFocusRef.current?.focus()
      returnFocusRef.current = null
    }
  }, [rendered])

  if (!rendered) {
    return null
  }

  return createPortal(
    <div className="ui-modal" ref={modalRef} role="presentation">
      <div
        aria-hidden="true"
        className="ui-modal__backdrop"
        onClick={() => {
          if (!locked) {
            onClose('backdrop')
          }
        }}
        ref={backdropRef}
      />
      <section
        aria-busy={locked || undefined}
        aria-modal="true"
        className={['ui-modal__panel', panelClassName]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <header className="ui-modal__header">
          <h2 id={titleId} ref={titleRef} tabIndex={-1}>
            {title}
          </h2>
          <Button
            aria-label={closeLabel}
            className="ui-modal__close"
            disabled={locked}
            icon={<X />}
            onClick={() => onClose('close-button')}
            variant="ghost"
          />
        </header>
        <div className="ui-modal__content">{children}</div>
        {footer ? <footer className="ui-modal__footer">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  )
}
