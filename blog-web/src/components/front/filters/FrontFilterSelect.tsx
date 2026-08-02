import { useEffect, useId, useRef, useState } from 'react'

import { FrontDropdownSurface, FrontIcon } from '@/components/front/visual'

type Option = {
  value: string
  label: string
}

type Props = {
  ariaLabel: string
  disabled?: boolean
  options: Option[]
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export const FrontFilterSelect = ({
  ariaLabel,
  disabled = false,
  options,
  placeholder,
  value,
  onChange,
}: Props) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listboxId = useId()
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedLabel = options[selectedIndex]?.label ?? placeholder

  const focusOption = (index: number) => {
    const normalizedIndex = (index + options.length) % options.length
    optionRefs.current[normalizedIndex]?.focus()
  }

  const openAndFocus = (index: number) => {
    if (disabled || !options.length) return
    setOpen(true)
    window.requestAnimationFrame(() => focusOption(index))
  }

  const closeAndFocus = () => {
    setOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  return (
    <div
      ref={rootRef}
      className={`front-filter-select ${disabled ? 'is-disabled' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="front-filter-select__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => {
          if (open) {
            setOpen(false)
          } else {
            openAndFocus(Math.max(0, selectedIndex))
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            const fallbackIndex =
              event.key === 'ArrowDown' ? 0 : options.length - 1
            openAndFocus(selectedIndex >= 0 ? selectedIndex : fallbackIndex)
          }
        }}
      >
        <span>{selectedLabel}</span>
        <FrontIcon name={open ? 'collapse' : 'expand'} size={16} />
      </button>
      {open ? (
        <FrontDropdownSurface
          id={listboxId}
          className="front-filter-select__menu"
          open
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option, index) => (
            <button
              ref={(element) => {
                optionRefs.current[index] = element
              }}
              key={option.value || 'all'}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`front-dropdown-surface__option ${
                option.value === value ? 'is-selected' : ''
              }`}
              onClick={() => {
                onChange(option.value)
                closeAndFocus()
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  focusOption(index + 1)
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  focusOption(index - 1)
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  focusOption(0)
                } else if (event.key === 'End') {
                  event.preventDefault()
                  focusOption(options.length - 1)
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  closeAndFocus()
                } else if (event.key === 'Tab') {
                  setOpen(false)
                }
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? (
                <span className="front-filter-select__mark" aria-hidden="true">
                  ●
                </span>
              ) : null}
            </button>
          ))}
        </FrontDropdownSurface>
      ) : null}
    </div>
  )
}
