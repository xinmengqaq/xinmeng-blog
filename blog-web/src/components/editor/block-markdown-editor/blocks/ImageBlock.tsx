import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { ImageBlock as ImageBlockType } from '../types'

type ImageBlockProps = {
  block: ImageBlockType
  readOnly: boolean
  selected?: boolean
  onSelect?: (element: HTMLElement) => void
}

export const ImageBlock = ({
  block,
  readOnly,
  selected,
  onSelect,
}: ImageBlockProps) => {
  const [failed, setFailed] = useState(false)
  const justifyItems =
    block.align === 'left'
      ? 'start'
      : block.align === 'right'
        ? 'end'
        : 'center'

  useEffect(() => setFailed(false), [block.url])

  return (
    <figure
      aria-selected={selected || undefined}
      className="block-editor__image"
      style={{ textAlign: block.align, justifyItems }}
      tabIndex={readOnly ? undefined : 0}
      onClick={(event) => onSelect?.(event.currentTarget)}
      onFocus={(event) => onSelect?.(event.currentTarget)}
    >
      {!block.url || failed ? (
        <div className="block-editor__image-placeholder">
          <ImageOff aria-hidden="true" />
          <span>{failed ? '图片加载失败' : '暂无图片'}</span>
        </div>
      ) : (
        <img
          src={block.url}
          alt={block.alt ?? ''}
          style={{ width: `${block.width ?? 100}%` }}
          onError={() => setFailed(true)}
        />
      )}
    </figure>
  )
}
