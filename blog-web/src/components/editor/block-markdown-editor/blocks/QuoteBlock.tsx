import { memo, type KeyboardEvent } from 'react'

import type { TextBlock } from '../types'
import { preserveEditorCaretAfterUpdate } from '../utils/dom'

type QuoteBlockProps = {
  block: TextBlock
  readOnly: boolean
  onChange: (block: TextBlock) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

const QuoteBlockComponent = ({
  block,
  readOnly,
  onChange,
  onKeyDown,
}: QuoteBlockProps) => (
  <blockquote
    className="block-editor__quote block-editor__editable"
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

export const QuoteBlock = memo(
  QuoteBlockComponent,
  (previous, next) =>
    previous.block === next.block && previous.readOnly === next.readOnly,
)
