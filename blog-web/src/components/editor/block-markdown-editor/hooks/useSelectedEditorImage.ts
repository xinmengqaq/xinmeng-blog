import { useEffect, useState } from 'react'

import type { ImageBlock } from '../types'
import type { BlockEditorModel } from './useBlockEditorModel'

export const useSelectedEditorImage = (model: BlockEditorModel) => {
  const [selection, setSelection] = useState<{
    blockId: string
    anchor: HTMLElement
  } | null>(null)
  const block = model.blocks.find(
    (item): item is ImageBlock =>
      item.id === selection?.blockId && item.type === 'image',
  )

  useEffect(() => {
    if (selection && !block) setSelection(null)
  }, [block, selection])

  return {
    block,
    selection,
    clear: () => setSelection(null),
    select: (blockId: string, anchor: HTMLElement) =>
      setSelection({ blockId, anchor }),
  }
}
