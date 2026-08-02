import { memo, type KeyboardEvent } from 'react'

import type { TextBlock } from '../types'

type ParagraphBlockProps = {
  block: TextBlock
  readOnly: boolean
  placeholder?: string
  onChange: (block: TextBlock) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onTextChange: (text: string) => void
}

const ParagraphBlockComponent = ({
  block,
  readOnly,
  placeholder,
  onChange,
  onKeyDown,
  onTextChange,
}: ParagraphBlockProps) => (
  <p
    className="block-editor__paragraph block-editor__editable"
    contentEditable={!readOnly}
    data-editor-input
    data-placeholder={placeholder}
    onInput={(event) => {
      onChange({ ...block, html: event.currentTarget.innerHTML })
      onTextChange(event.currentTarget.textContent ?? '')
    }}
    onKeyDown={onKeyDown}
    suppressContentEditableWarning
    dangerouslySetInnerHTML={{ __html: block.html }}
  />
)

export const ParagraphBlock = memo(
  ParagraphBlockComponent,
  (previous, next) =>
    previous.block === next.block &&
    previous.readOnly === next.readOnly &&
    previous.placeholder === next.placeholder,
)
