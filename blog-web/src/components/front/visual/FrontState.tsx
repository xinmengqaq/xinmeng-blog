import { FrontAssetImage } from '@/components/front/visual/FrontAssetImage'
import { FrontIcon } from '@/components/front/visual/FrontIcon'

type Props = {
  variant: 'empty' | 'error'
  title: string
  description: string
  actionText?: string
  onAction?: () => void
  compact?: boolean
}

export const FrontState = ({
  variant,
  title,
  description,
  actionText = '重试',
  onAction,
  compact = false,
}: Props) => (
  <div
    className={`front-state front-state--${variant} ${compact ? 'front-state--compact' : ''}`.trim()}
    role={variant === 'error' ? 'alert' : 'status'}
  >
    <FrontAssetImage
      className="front-state__art"
      name={variant === 'empty' ? 'emptyTicket' : 'pausedSignal'}
    />
    <h2>{title}</h2>
    <p>{description}</p>
    {onAction ? (
      <button type="button" onClick={onAction}>
        <FrontIcon name="retry" size={16} />
        {actionText}
      </button>
    ) : null}
  </div>
)
