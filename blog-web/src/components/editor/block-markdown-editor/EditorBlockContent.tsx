import { CodeBlock } from './blocks/CodeBlock'
import { HeadingBlock } from './blocks/HeadingBlock'
import { ImageBlock } from './blocks/ImageBlock'
import { ListBlock } from './blocks/ListBlock'
import { ParagraphBlock } from './blocks/ParagraphBlock'
import { QuoteBlock } from './blocks/QuoteBlock'
import { TableBlock } from './blocks/TableBlock'
import type { BlockEditorInteractions } from './hooks/useBlockEditorInteractions'
import type { BlockEditorModel } from './hooks/useBlockEditorModel'
import type { EditorBlock } from './types'

type EditorBlockContentProps = {
  block: EditorBlock
  interactions: BlockEditorInteractions
  model: BlockEditorModel
  placeholder?: string
  readOnly: boolean
  selectedImageBlockId?: string
  onSelectImage: (blockId: string, anchor: HTMLElement) => void
}

export const EditorBlockContent = ({
  block,
  interactions,
  model,
  placeholder,
  readOnly,
  selectedImageBlockId,
  onSelectImage,
}: EditorBlockContentProps) => {
  const onKeyDown = interactions.blockKeyDown(block)

  switch (block.type) {
    case 'paragraph':
      return (
        <ParagraphBlock
          block={block}
          placeholder={placeholder}
          readOnly={readOnly}
          onChange={model.replaceBlock}
          onKeyDown={onKeyDown}
          onTextChange={(text) => model.convertShortcut(block.id, text)}
        />
      )
    case 'heading':
      return (
        <HeadingBlock
          block={block}
          readOnly={readOnly}
          onChange={model.replaceBlock}
          onKeyDown={onKeyDown}
        />
      )
    case 'quote':
      return (
        <QuoteBlock
          block={block}
          readOnly={readOnly}
          onChange={model.replaceBlock}
          onKeyDown={onKeyDown}
        />
      )
    case 'unordered-list':
    case 'ordered-list':
    case 'task-list':
      return (
        <ListBlock
          block={block}
          readOnly={readOnly}
          onChange={model.replaceBlock}
          onExitItem={(itemId) => model.exitListBlockItem(block.id, itemId)}
          onKeyDown={onKeyDown}
        />
      )
    case 'code':
      return (
        <CodeBlock
          block={block}
          readOnly={readOnly}
          onChange={model.replaceBlock}
        />
      )
    case 'image':
      return (
        <ImageBlock
          block={block}
          readOnly={readOnly}
          selected={selectedImageBlockId === block.id}
          onSelect={(anchor) => onSelectImage(block.id, anchor)}
        />
      )
    case 'table':
      return (
        <TableBlock
          block={block}
          readOnly={readOnly}
          onChange={model.replaceBlock}
          onDelete={() => model.deleteToolbarBlock(block.id)}
          onKeyDown={onKeyDown}
        />
      )
    case 'divider':
      return <hr className="block-editor__divider" />
  }
}
