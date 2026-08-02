import { Inbox } from 'lucide-react'

import { Button } from './Button'
import './ui.css'

type EmptyStateProps = {
  title?: string
  description?: string
  actionText?: string
  onAction?: () => void
}

export const EmptyState = ({
  title = '暂无数据',
  description = '当前暂无数据。',
  actionText,
  onAction,
}: EmptyStateProps) => (
  <div className="ui-state ui-state--empty">
    <Inbox aria-hidden="true" />
    <strong>{title}</strong>
    <p>{description}</p>
    {actionText && onAction ? (
      <Button onClick={onAction} variant="secondary">
        {actionText}
      </Button>
    ) : null}
  </div>
)
