import type { EditorImageUpload } from '../hooks/useEditorImageUpload'
import type { BlockEditorModel } from '../hooks/useBlockEditorModel'
import { ImageToolbar } from './ImageToolbar'

type SelectedImageToolbarProps = {
  anchor: HTMLElement
  blockId: string
  disabled: boolean
  imageUpload: EditorImageUpload
  model: BlockEditorModel
  onClose: () => void
}

export const SelectedImageToolbar = ({
  anchor,
  blockId,
  disabled,
  imageUpload,
  model,
  onClose,
}: SelectedImageToolbarProps) => {
  const block = model.blocks.find(
    (item) => item.id === blockId && item.type === 'image',
  )
  if (!block || block.type !== 'image') return null

  return (
    <ImageToolbar
      anchor={anchor}
      block={block}
      disabled={disabled}
      draft={imageUpload.getDraft(block.url)}
      preparingCrop={imageUpload.preparingCrop}
      onAlignChange={(align) => model.replaceBlock({ ...block, align })}
      onAltChange={(alt) => model.replaceBlock({ ...block, alt })}
      onClose={onClose}
      onRecrop={() => void imageUpload.recrop(block)}
      onRemove={() => imageUpload.setRemoveBlock(block)}
      onReplace={() => imageUpload.openReplace(block.id)}
    />
  )
}
