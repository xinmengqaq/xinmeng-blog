import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  open: boolean
}

export const FrontDropdownSurface = ({
  children,
  className = '',
  open,
  ...props
}: Props) => (
  <div
    {...props}
    className={`front-dropdown-surface ${
      open ? 'is-open' : ''
    } ${className}`.trim()}
  >
    {children}
  </div>
)
