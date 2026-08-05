import { memo, type KeyboardEvent } from 'react'

import type { HeadingBlock as HeadingBlockType } from '../types'
import { preserveEditorCaretAfterUpdate } from '../utils/dom'

type HeadingBlockProps = {
  block: HeadingBlockType
  readOnly: boolean
  onChange: (block: HeadingBlockType) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

const HeadingBlockComponent = ({
  block,
  readOnly,
  onChange,
  onKeyDown,
}: HeadingBlockProps) => {
  const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4'

  return (
    <Tag
      className={`block-editor__heading block-editor__heading--${block.level} block-editor__editable`}
      contentEditable={!readOnly}
      data-editor-input
      onInput={(event) => {
        const editable = event.currentTarget
        preserveEditorCaretAfterUpdate(editable, () =>
          onChange({ ...block, html: editable.innerHTML }),
        )
      }}
      onKeyDown={onKeyDown}
      suppressContentEditableWarning
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  )
}

export const HeadingBlock = memo(
  HeadingBlockComponent,
  (previous, next) =>
    previous.block === next.block && previous.readOnly === next.readOnly,
)
