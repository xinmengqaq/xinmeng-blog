import { MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Button } from './Button'
import './ui.css'

export type MenuItem = {
  label: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  separatorBefore?: boolean
  onSelect: () => void
}

type MenuProps = {
  items: MenuItem[]
  label?: string
}

export const Menu = ({ items, label = '更多操作' }: MenuProps) => {
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      setPosition({ top: rect.bottom + 6, left: rect.right })
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    updatePosition()
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePosition)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  return (
    <>
      <Button
        ref={triggerRef}
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="ui-menu__trigger"
        icon={<MoreHorizontal />}
        onClick={() => setOpen((current) => !current)}
        size="sm"
        variant="ghost"
      />
      {open
        ? createPortal(
            <div
              id={menuId}
              className="ui-menu"
              ref={menuRef}
              role="menu"
              style={{ top: position.top, left: position.left }}
            >
              {items.map((item) => (
                <div key={item.label}>
                  {item.separatorBefore ? (
                    <div className="ui-menu__separator" role="separator" />
                  ) : null}
                  <button
                    className={`ui-menu__item ${item.danger ? 'ui-menu__item--danger' : ''}`}
                    disabled={item.disabled}
                    onClick={() => {
                      item.onSelect()
                      setOpen(false)
                    }}
                    role="menuitem"
                    type="button"
                  >
                    {item.icon ? (
                      <span aria-hidden="true">{item.icon}</span>
                    ) : null}
                    {item.label}
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
