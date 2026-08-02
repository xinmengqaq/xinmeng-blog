import { useState } from 'react'

import { frontSite } from '@/config/frontSite'
import { FrontIcon } from '@/components/front/visual/FrontIcon'
import { frontBrandAssets } from '@/components/front/visual/frontAssets'

type Props = {
  className?: string
  graphicOnly?: boolean
}

export const FrontBrandMark = ({
  className = '',
  graphicOnly = false,
}: Props) => {
  const [failed, setFailed] = useState(false)

  return (
    <span
      className={`front-brand-mark ${className}`.trim()}
      aria-label={frontSite.name}
      role={graphicOnly ? 'img' : undefined}
    >
      <span className="front-brand-mark__graphic" aria-hidden="true">
        {failed ? (
          <FrontIcon name="home" size={32} />
        ) : (
          <picture>
            <source
              media="(max-width: 389px)"
              srcSet={frontBrandAssets.simplifiedMark}
            />
            <img
              src={frontBrandAssets.primaryMark}
              alt=""
              draggable={false}
              onError={() => setFailed(true)}
            />
          </picture>
        )}
      </span>
      {graphicOnly ? null : (
        <span className="front-brand-mark__name">{frontSite.name}</span>
      )}
    </span>
  )
}
