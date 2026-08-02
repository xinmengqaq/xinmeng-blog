import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

import './ui.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
  size?: 'sm' | 'md'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(' ')

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      className,
      type = 'button',
      ...props
    },
    ref,
  ) {
    const hasLeftIcon = loading || (icon && iconPosition === 'left')
    const hasRightIcon = !loading && icon && iconPosition === 'right'

    return (
      <button
        ref={ref}
        className={cx(
          'ui-button',
          `ui-button--${variant}`,
          `ui-button--${size}`,
          loading && 'ui-button--loading',
          className,
        )}
        disabled={disabled || loading}
        type={type}
        aria-busy={loading || undefined}
        {...props}
      >
        {hasLeftIcon ? (
          <span className="ui-button__icon" aria-hidden="true">
            {loading ? <LoaderCircle /> : icon}
          </span>
        ) : null}
        <span className="ui-button__label">{children}</span>
        {hasRightIcon ? (
          <span className="ui-button__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </button>
    )
  },
)
