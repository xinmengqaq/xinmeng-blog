import { useEffect, useState, type ReactNode, type RefObject } from 'react'

import {
  frontIllustrationAssets,
  type FrontIllustrationName,
} from '@/components/front/visual/frontAssets'

type Props = {
  name: FrontIllustrationName
  className?: string
  decorative?: boolean
  label?: string
  fallback?: ReactNode
  imageRef?: RefObject<HTMLImageElement | null>
}

export const FrontAssetImage = ({
  name,
  className = '',
  decorative = true,
  label,
  fallback = null,
  imageRef,
}: Props) => {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [name])

  if (failed) return fallback

  return (
    <img
      className={className}
      ref={imageRef}
      src={frontIllustrationAssets[name]}
      alt={decorative ? '' : (label ?? '')}
      aria-hidden={decorative ? 'true' : undefined}
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
