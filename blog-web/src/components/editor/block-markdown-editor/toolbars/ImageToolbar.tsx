import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom'
import { Crop, ImageUp, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

import type { ImageDraft } from '@/types/file'

import type { ImageBlock } from '../types'

type ImageToolbarProps = {
  anchor: HTMLElement
  block: ImageBlock
  disabled: boolean
  draft?: ImageDraft
  preparingCrop: boolean
  onAltChange: (alt: string) => void
  onClose: () => void
  onRecrop: () => void
  onRemove: () => void
  onReplace: () => void
}

export const ImageToolbar = ({
  anchor,
  block,
  disabled,
  draft,
  preparingCrop,
  onAltChange,
  onClose,
  onRecrop,
  onRemove,
  onReplace,
}: ImageToolbarProps) => {
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const { refs, floatingStyles } = useFloating({
    open: true,
    placement: 'top',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const isGif = draft?.type === 'gif' || /\.gif(?:$|[?#])/i.test(block.url)

  useEffect(() => {
    refs.setReference(anchor)
    return () => refs.setReference(null)
  }, [anchor, refs])

  useEffect(() => {
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') onClose()
        return
      }
      const target = event.target as Node
      if (!anchor.contains(target) && !toolbarRef.current?.contains(target)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [anchor, onClose])

  return (
    <div
      ref={(element) => {
        toolbarRef.current = element
        refs.setFloating(element)
      }}
      aria-label="图片工具"
      className="block-editor__toolbar block-editor__image-toolbar"
      role="toolbar"
      style={floatingStyles}
    >
      <label>
        <span>替代文本</span>
        <input
          aria-label="图片替代文本"
          disabled={disabled}
          placeholder="可为空"
          value={block.alt ?? ''}
          onChange={(event) => onAltChange(event.target.value)}
        />
      </label>
      <div className="block-editor__toolbar-group">
        <button
          aria-label="更换图片"
          disabled={disabled}
          title="更换图片"
          type="button"
          onClick={onReplace}
        >
          <ImageUp aria-hidden="true" />
        </button>
        {!isGif ? (
          <button
            aria-label="重新裁剪"
            disabled={disabled || preparingCrop}
            title="重新裁剪"
            type="button"
            onClick={onRecrop}
          >
            <Crop aria-hidden="true" />
          </button>
        ) : null}
        <button
          aria-label="移除图片"
          className="block-editor__toolbar-danger"
          disabled={disabled}
          title="移除图片"
          type="button"
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
