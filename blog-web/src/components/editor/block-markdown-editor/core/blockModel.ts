import type {
  EditorBlock,
  HeadingBlock,
  ListItem,
  TableBlock,
  TableCell,
  TextBlock,
} from '../types'

let fallbackId = 0
let blockIdFactory: () => string = () =>
  globalThis.crypto?.randomUUID?.() ?? `block-${++fallbackId}`

export const setBlockIdFactory = (factory?: () => string) => {
  blockIdFactory =
    factory ??
    (() => globalThis.crypto?.randomUUID?.() ?? `block-${++fallbackId}`)
}

export const createBlockId = () => blockIdFactory()

export const createParagraphBlock = (html = ''): TextBlock => ({
  id: createBlockId(),
  type: 'paragraph',
  html,
})

export const createHeadingBlock = (
  level: 1 | 2 | 3 | 4,
  html = '',
): HeadingBlock => ({
  id: createBlockId(),
  type: 'heading',
  level,
  html,
})

export const createListItem = (
  html = '',
  options: Pick<ListItem, 'indent' | 'checked'> = {
    indent: 0,
    checked: undefined,
  },
): ListItem => ({ id: createBlockId(), html, ...options })

export const createTableCell = (html = ''): TableCell => ({
  id: createBlockId(),
  html,
  rowspan: 1,
  colspan: 1,
  align: 'left',
})

export const createDefaultTableBlock = (): TableBlock => ({
  id: createBlockId(),
  type: 'table',
  hasHeader: true,
  columnWidths: ['', '', ''],
  rows: Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => createTableCell()),
  ),
})

export const ensureNonEmptyDocument = (blocks: EditorBlock[]) =>
  blocks.length > 0 ? blocks : [createParagraphBlock()]

export const getPlainTextFromHtml = (html: string) => {
  const document = new DOMParser().parseFromString(html, 'text/html')
  return document.body.textContent ?? ''
}

export const isBlockEmpty = (block: EditorBlock) => {
  switch (block.type) {
    case 'paragraph':
    case 'quote':
    case 'heading':
      return getPlainTextFromHtml(block.html).trim().length === 0
    case 'unordered-list':
    case 'ordered-list':
    case 'task-list':
      return block.items.every(
        (item) => getPlainTextFromHtml(item.html).trim().length === 0,
      )
    case 'code':
      return block.code.trim().length === 0
    case 'image':
      return block.url.trim().length === 0
    case 'table':
      return block.rows.every((row) =>
        row.every(
          (cell) => getPlainTextFromHtml(cell.html).trim().length === 0,
        ),
      )
    case 'divider':
      return false
  }
}

export const cloneBlockWithNewIds = (block: EditorBlock): EditorBlock => {
  switch (block.type) {
    case 'unordered-list':
    case 'ordered-list':
    case 'task-list':
      return {
        ...block,
        id: createBlockId(),
        items: block.items.map((item) => ({ ...item, id: createBlockId() })),
      }
    case 'table':
      return {
        ...block,
        id: createBlockId(),
        rows: block.rows.map((row) =>
          row.map((cell) => ({ ...cell, id: createBlockId() })),
        ),
      }
    default:
      return { ...block, id: createBlockId() }
  }
}
