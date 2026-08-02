import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { Button } from './Button'
import './ui.css'

type ModalProps = {
  open: boolean
  title: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  closeLabel?: string
  panelClassName?: string
}

export const Modal = ({
  open,
  title,
  children,
  footer,
  onClose,
  closeLabel = '关闭',
  panelClassName,
}: ModalProps) => {
  useEffect(() => {
    if (!open) {
      return
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousModalHeight = document.documentElement.style.getPropertyValue(
      '--ui-modal-document-height',
    )
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
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
  }, [onClose, open])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="ui-modal" role="presentation">
      <button
        aria-label={closeLabel}
        className="ui-modal__backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-modal="true"
        className={['ui-modal__panel', panelClassName]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-labelledby="ui-modal-title"
      >
        <header className="ui-modal__header">
          <h2 id="ui-modal-title">{title}</h2>
          <Button
            aria-label={closeLabel}
            className="ui-modal__close"
            icon={<X />}
            onClick={onClose}
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
