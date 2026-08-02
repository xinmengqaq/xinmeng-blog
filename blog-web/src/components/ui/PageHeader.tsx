import type { ReactNode } from 'react'

import './ui.css'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
}

export const PageHeader = ({
  title,
  description,
  actions,
}: PageHeaderProps) => (
  <header className="ui-page-header">
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
    {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
  </header>
)
