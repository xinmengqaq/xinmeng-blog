export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'quote'
  | 'unordered-list'
  | 'ordered-list'
  | 'task-list'
  | 'code'
  | 'image'
  | 'table'
  | 'divider'

export type TextAlign = 'left' | 'center' | 'right'

export type EditorBlockBase = {
  id: string
  type: BlockType
}

export type TextBlock = EditorBlockBase & {
  type: 'paragraph' | 'quote'
  html: string
}

export type HeadingBlock = EditorBlockBase & {
  type: 'heading'
  level: 1 | 2 | 3 | 4
  html: string
}

export type ListItem = {
  id: string
  html: string
  checked?: boolean
  indent: 0 | 1 | 2
}

export type ListBlock = EditorBlockBase & {
  type: 'unordered-list' | 'ordered-list' | 'task-list'
  items: ListItem[]
}

export type CodeBlock = EditorBlockBase & {
  type: 'code'
  language?: string
  code: string
}

export type ImageBlock = EditorBlockBase & {
  type: 'image'
  url: string
  alt?: string
  align: TextAlign
  width?: number
}

export type TableCell = {
  id: string
  html: string
  rowspan: number
  colspan: number
  align: TextAlign
}

export type TableBlock = EditorBlockBase & {
  type: 'table'
  hasHeader: boolean
  columnWidths: string[]
  rows: TableCell[][]
}

export type DividerBlock = EditorBlockBase & {
  type: 'divider'
}

export type EditorBlock =
  | TextBlock
  | HeadingBlock
  | ListBlock
  | CodeBlock
  | ImageBlock
  | TableBlock
  | DividerBlock

export type BlockMarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  onSaveShortcut?: () => void
  imageDrafts?: ReadonlyMap<string, ImageDraft>
  onImageDraftCreate?: (draft: ImageDraft) => void
  onImageDraftRelease?: (previewUrl: string) => void
}
import type { ImageDraft } from '@/types/file'
