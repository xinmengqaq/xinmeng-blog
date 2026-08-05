import { convertBlockType } from './commands'
import { ensureNonEmptyDocument } from './blockModel'
import type { EditorBlock } from '../types'

export type BulkInlineFormat = 'strong' | 'em' | 'u' | 'del' | 'code'

const wrap = (html: string, tag: BulkInlineFormat) =>
  html ? `<${tag}>${html}</${tag}>` : html

const applyToBlock = (
  block: EditorBlock,
  tag: BulkInlineFormat,
): EditorBlock => {
  if (
    block.type === 'paragraph' ||
    block.type === 'heading' ||
    block.type === 'quote'
  ) {
    return { ...block, html: wrap(block.html, tag) }
  }
  if (
    block.type === 'unordered-list' ||
    block.type === 'ordered-list' ||
    block.type === 'task-list'
  ) {
    return {
      ...block,
      items: block.items.map((item) => ({
        ...item,
        html: wrap(item.html, tag),
      })),
    }
  }
  if (block.type === 'table') {
    return {
      ...block,
      rows: block.rows.map((row) =>
        row.map((cell) => ({ ...cell, html: wrap(cell.html, tag) })),
      ),
    }
  }
  return block
}

export const removeSelectedBlocks = (
  blocks: EditorBlock[],
  selectedIds: string[],
) =>
  ensureNonEmptyDocument(
    blocks.filter((block) => !selectedIds.includes(block.id)),
  )

export const convertSelectedBlocksToParagraph = (
  blocks: EditorBlock[],
  selectedIds: string[],
) =>
  selectedIds.reduce(
    (current, blockId) => convertBlockType(current, blockId, 'paragraph'),
    blocks,
  )

export const formatSelectedBlocks = (
  blocks: EditorBlock[],
  selectedIds: string[],
  tag: BulkInlineFormat,
) =>
  blocks.map((block) =>
    selectedIds.includes(block.id) ? applyToBlock(block, tag) : block,
  )
