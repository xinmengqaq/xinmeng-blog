import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

import './ui.css'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(' ')

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, leftIcon, rightIcon, className, ...props }, ref) => (
    <span
      className={cx(
        'ui-input-wrap',
        error && 'ui-input-wrap--error',
        Boolean(leftIcon) && 'ui-input-wrap--with-left-icon',
        Boolean(rightIcon) && 'ui-input-wrap--with-right-icon',
        props.readOnly && 'ui-input-wrap--readonly',
        className,
      )}
    >
      {leftIcon ? (
        <span className="ui-input-wrap__icon ui-input-wrap__icon--left">
          {leftIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        className="ui-input"
        aria-invalid={error || undefined}
        {...props}
      />
      {rightIcon ? (
        <span className="ui-input-wrap__icon ui-input-wrap__icon--right">
          {rightIcon}
        </span>
      ) : null}
    </span>
  ),
)

Input.displayName = 'Input'
