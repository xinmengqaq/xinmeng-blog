import type { ReactNode } from 'react'

import './ui.css'

type DataSectionProps = {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export const DataSection = ({
  title,
  description,
  children,
  footer,
}: DataSectionProps) => (
  <section className="ui-data-section">
    <header className="ui-data-section__header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    </header>
    <div className="ui-data-section__content">{children}</div>
    {footer ? (
      <footer className="ui-data-section__footer">{footer}</footer>
    ) : null}
  </section>
)
