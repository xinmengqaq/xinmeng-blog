import { CircleX } from 'lucide-react'

import { Button } from './Button'
import './ui.css'

type ErrorStateProps = {
  title?: string
  description?: string
  actionText?: string
  onRetry?: () => void
}

export const ErrorState = ({
  title = '加载失败',
  description = '无法加载数据，请重试。',
  actionText = '重试',
  onRetry,
}: ErrorStateProps) => (
  <div className="ui-state ui-state--error" role="alert">
    <CircleX aria-hidden="true" />
    <strong>{title}</strong>
    <p>{description}</p>
    {onRetry ? (
      <Button onClick={onRetry} variant="secondary">
        {actionText}
      </Button>
    ) : null}
  </div>
)
