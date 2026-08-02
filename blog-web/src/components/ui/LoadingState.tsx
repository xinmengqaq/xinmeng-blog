import { LoaderCircle } from 'lucide-react'

import './ui.css'

type LoadingStateProps = {
  title?: string
  description?: string
}

export const LoadingState = ({
  title = '加载中',
  description = '数据加载中，请稍候。',
}: LoadingStateProps) => (
  <div className="ui-state ui-state--loading" role="status">
    <LoaderCircle aria-hidden="true" />
    <strong>{title}</strong>
    <p>{description}</p>
  </div>
)
