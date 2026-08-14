import { memo, useRef, type KeyboardEvent } from 'react'

import type { TextBlock } from '../types'
import { preserveEditorCaretAfterUpdate } from '../utils/dom'

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
}: ParagraphBlockProps) => {
  const composingRef = useRef(false)
  const commitInput = (editable: HTMLElement) =>
    preserveEditorCaretAfterUpdate(editable, () => {
      onChange({ ...block, html: editable.innerHTML })
      onTextChange(editable.textContent ?? '')
    })

  return (
    <p
      className="block-editor__paragraph block-editor__editable"
      contentEditable={!readOnly}
      data-editor-input
      data-placeholder={placeholder}
      onInput={(event) => {
        if (!composingRef.current) commitInput(event.currentTarget)
      }}
      onCompositionStart={() => {
        composingRef.current = true
      }}
      onCompositionEnd={(event) => {
        composingRef.current = false
        commitInput(event.currentTarget)
      }}
      onKeyDown={onKeyDown}
      suppressContentEditableWarning
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  )
}

export const ParagraphBlock = memo(
  ParagraphBlockComponent,
  (previous, next) =>
    previous.block === next.block &&
    previous.readOnly === next.readOnly &&
    previous.placeholder === next.placeholder,
)
