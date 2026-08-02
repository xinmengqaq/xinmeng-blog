import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { FrontIcon } from '@/components/front/visual'

import './FrontTagDialog.css'

gsap.registerPlugin(useGSAP)

type Tag = { id: number; name: string }

type Props = {
  open: boolean
  tags: Tag[]
  selected: number[]
  onClose: () => void
  onAfterClose?: () => void
  onChange: (ids: number[]) => void
}

export const FrontTagDialog = ({
  open,
  tags,
  selected,
  onClose,
  onAfterClose,
  onChange,
}: Props) => {
  const [query, setQuery] = useState('')
  const [rendered, setRendered] = useState(open)
  const rootRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const filtered = tags.filter(
    (tag) =>
      !selected.includes(tag.id) &&
      tag.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setRendered(true)
    }
  }, [open])

  useGSAP(
    () => {
      if (!rendered || !backdropRef.current || !panelRef.current) return

      const backdrop = backdropRef.current
      const panel = panelRef.current
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const mobile = window.matchMedia('(max-width: 767px)').matches
      const offsetY = mobile ? 28 : 18
      const startScale = mobile ? 1 : 0.98

      if (reducedMotion) {
        gsap.set([backdrop, panel], { autoAlpha: 1, clearProps: 'transform' })
        if (!open) {
          setRendered(false)
          onAfterClose?.()
        }
        return
      }

      const timeline = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: open
          ? undefined
          : () => {
              setRendered(false)
              onAfterClose?.()
            },
      })

      if (open) {
        timeline
          .fromTo(
            backdrop,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.18, ease: 'power1.out' },
            0,
          )
          .fromTo(
            panel,
            { autoAlpha: 0, y: offsetY, scale: startScale },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.24,
              ease: 'power2.out',
            },
            0.03,
          )
      } else {
        timeline
          .to(panel, {
            autoAlpha: 0,
            y: offsetY,
            scale: startScale,
            duration: 0.18,
            ease: 'power1.in',
          })
          .to(
            backdrop,
            { autoAlpha: 0, duration: 0.16, ease: 'power1.in' },
            0.02,
          )
      }

      return () => timeline.kill()
    },
    {
      scope: rootRef,
      dependencies: [open, rendered, onAfterClose],
      revertOnUpdate: true,
    },
  )

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  useEffect(() => {
    if (!rendered) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [rendered])

  if (!rendered || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={rootRef}
      className="tag-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="选择标签"
    >
      <button
        ref={backdropRef}
        className="tag-dialog__backdrop"
        onClick={onClose}
        type="button"
        aria-label="关闭标签弹窗"
      />
      <div ref={panelRef} className="tag-dialog__panel">
        <header>
          <h2>
            <FrontIcon name="tag" size={24} />
            选择标签
          </h2>
          <button
            className="icon-button"
            onClick={onClose}
            type="button"
            autoFocus={tags.length <= 12}
            aria-label="关闭"
            title="关闭"
          >
            <FrontIcon name="close" size={24} />
          </button>
        </header>
        <div className="tag-dialog__body">
          {tags.length > 12 ? (
            <label className="tag-dialog__search">
              <FrontIcon
                name="search"
                size={16}
                state={query ? 'active' : 'default'}
              />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标签"
                aria-label="搜索标签"
              />
            </label>
          ) : null}
          <section className="tag-dialog__section" aria-label="已选标签">
            <div className="tag-dialog__section-heading">
              <span>已选标签</span>
              <strong>{selected.length}</strong>
            </div>
            <div className="tag-dialog__selected">
              {selected.length ? (
                selected.map((id) => {
                  const tag = tags.find((item) => item.id === id)
                  return tag ? (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        onChange(selected.filter((value) => value !== id))
                      }
                    >
                      {tag.name}
                      <FrontIcon name="close" size={16} />
                    </button>
                  ) : null
                })
              ) : (
                <span>还没有选择标签</span>
              )}
            </div>
          </section>
          <section className="tag-dialog__section" aria-label="可选标签">
            <div className="tag-dialog__section-heading">
              <span>可选标签</span>
              <small>可连续选择</small>
            </div>
            <div className="tag-dialog__list">
              {filtered.length ? (
                filtered.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={false}
                    onClick={() => onChange([...selected, tag.id])}
                  >
                    {tag.name}
                  </button>
                ))
              ) : (
                <p className="tag-dialog__empty">
                  {query ? '没有匹配的标签' : '没有更多可选标签'}
                </p>
              )}
            </div>
          </section>
        </div>
        <footer>
          <button
            type="button"
            className="tag-dialog__clear"
            onClick={() => onChange([])}
            disabled={!selected.length}
          >
            清空已选
          </button>
          <button type="button" className="tag-dialog__done" onClick={onClose}>
            完成
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
