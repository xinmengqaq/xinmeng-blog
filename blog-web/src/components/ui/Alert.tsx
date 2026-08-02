import type { ReactNode } from 'react'

import './ui.css'

type AlertType = 'success' | 'error' | 'warning' | 'info'

type AlertProps = {
  type?: AlertType
  title?: string
  children: ReactNode
}

export const Alert = ({ type = 'info', title, children }: AlertProps) => {
  return (
    <div className={`ui-alert ui-alert--${type}`} role="alert">
      <div className="ui-alert__body">
        {title ? <strong>{title}</strong> : null}
        <span>{children}</span>
      </div>
    </div>
  )
}
