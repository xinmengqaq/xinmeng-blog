import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

import type {
  EditorBlock,
  ListBlock,
  ListItem,
  TableBlock,
  TextAlign,
} from '../types'
import {
  createBlockId,
  createListItem,
  createParagraphBlock,
  ensureNonEmptyDocument,
} from '../core/blockModel'
import { sanitizeEditorHtml } from './sanitizeHtml'

type MarkdownNode = {
  type: string
  value?: string
  depth?: number
  ordered?: boolean
  checked?: boolean | null
  lang?: string | null
  url?: string
  alt?: string | null
  align?: Array<TextAlign | null>
  children?: MarkdownNode[]
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const renderInlineNode = (node: MarkdownNode): string => {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.value ?? '')
    case 'strong':
      return `<strong>${inlineNodesToHtml(node.children)}</strong>`
    case 'emphasis':
      return `<em>${inlineNodesToHtml(node.children)}</em>`
    case 'delete':
      return `<s>${inlineNodesToHtml(node.children)}</s>`
    case 'inlineCode':
      return `<code>${escapeHtml(node.value ?? '')}</code>`
    case 'link':
      return `<a href="${escapeHtml(node.url ?? '')}">${inlineNodesToHtml(node.children)}</a>`
    case 'break':
      return '<br>'
    case 'html':
      return sanitizeEditorHtml(node.value ?? '')
    case 'image':
      return escapeHtml(node.alt ?? node.url ?? '')
    default:
      return node.children
        ? inlineNodesToHtml(node.children)
        : escapeHtml(node.value ?? '')
  }
}

const renderSafeInlineWrapper = (
  openingTag: string,
  tagName: string,
  content: string,
) => {
  const clean = sanitizeEditorHtml(`${openingTag}</${tagName}>`)
  const document = new DOMParser().parseFromString(clean, 'text/html')
  const wrapper = document.body.firstElementChild
  if (!wrapper || wrapper.tagName.toLowerCase() !== tagName) return content
  wrapper.innerHTML = content
  return wrapper.outerHTML
}

const inlineNodesToHtml = (nodes: MarkdownNode[] = []): string => {
  let html = ''
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    const opening =
      node.type === 'html' ? node.value?.match(/^<(span|u)\b[^>]*>$/i) : null
    if (!opening) {
      html += renderInlineNode(node)
      continue
    }

    const tagName = opening[1].toLowerCase()
    let depth = 1
    let closingIndex = index + 1
    for (; closingIndex < nodes.length; closingIndex += 1) {
      const value =
        nodes[closingIndex].type === 'html' ? nodes[closingIndex].value : ''
      if (value?.match(new RegExp(`^<${tagName}\\b[^>]*>$`, 'i'))) depth += 1
      if (value?.match(new RegExp(`^</${tagName}>$`, 'i'))) depth -= 1
      if (depth === 0) break
    }
    if (depth !== 0) {
      html += renderInlineNode(node)
      continue
    }

    html += renderSafeInlineWrapper(
      node.value ?? '',
      tagName,
      inlineNodesToHtml(nodes.slice(index + 1, closingIndex)),
    )
    index = closingIndex
  }
  return html
}

const nodeText = (node: MarkdownNode): string =>
  node.value ?? node.alt ?? node.children?.map(nodeText).join('') ?? ''

const listItemsFromNode = (node: MarkdownNode, indent = 0): ListItem[] => {
  const items: ListItem[] = []
  for (const item of node.children ?? []) {
    const paragraph = item.children?.find((child) => child.type === 'paragraph')
    items.push(
      createListItem(inlineNodesToHtml(paragraph?.children), {
        indent: Math.min(indent, 2) as 0 | 1 | 2,
        checked: item.checked ?? undefined,
      }),
    )
    for (const nested of item.children?.filter(
      (child) => child.type === 'list',
    ) ?? []) {
      items.push(...listItemsFromNode(nested, indent + 1))
    }
  }
  return items
}

const tableFromHtml = (html: string): TableBlock | null => {
  const clean = sanitizeEditorHtml(html)
  const document = new DOMParser().parseFromString(clean, 'text/html')
  const table = document.querySelector('table')
  if (!table) {
    return null
  }

  const columnWidths = Array.from(table.querySelectorAll('col')).map(
    (column) => column.style.width,
  )
  const rows = Array.from(table.querySelectorAll('tr')).map((row) =>
    Array.from(row.children)
      .filter((cell) => cell.matches('th, td'))
      .map((cell) => ({
        id: createBlockId(),
        html: cell.innerHTML,
        rowspan: Number(cell.getAttribute('rowspan')) || 1,
        colspan: Number(cell.getAttribute('colspan')) || 1,
        align: (cell
          .getAttribute('style')
          ?.match(/text-align:(left|center|right)/)?.[1] ??
          'left') as TextAlign,
      })),
  )

  return rows.length
    ? {
        id: createBlockId(),
        type: 'table',
        hasHeader: Boolean(table.querySelector('thead')),
        columnWidths,
        rows,
      }
    : null
}

const nodeToBlocks = (node: MarkdownNode): EditorBlock[] => {
  switch (node.type) {
    case 'heading':
      return [
        {
          id: createBlockId(),
          type: 'heading',
          level: Math.min(node.depth ?? 1, 4) as 1 | 2 | 3 | 4,
          html: inlineNodesToHtml(node.children),
        },
      ]
    case 'paragraph':
      if (node.children?.length === 1 && node.children[0].type === 'image') {
        return [
          {
            id: createBlockId(),
            type: 'image',
            url: node.children[0].url ?? '',
            alt: node.children[0].alt ?? '',
          },
        ]
      }
      return [createParagraphBlock(inlineNodesToHtml(node.children))]
    case 'blockquote':
      return [
        {
          id: createBlockId(),
          type: 'quote',
          html: (node.children ?? [])
            .map((child) =>
              child.type === 'paragraph'
                ? inlineNodesToHtml(child.children)
                : escapeHtml(nodeText(child)),
            )
            .join('<br>'),
        },
      ]
    case 'list': {
      const items = listItemsFromNode(node)
      const groups = items.reduce<ListItem[][]>((result, item) => {
        const current = result.at(-1)
        const isTask = item.checked !== undefined
        const currentIsTask = current?.[0]?.checked !== undefined
        if (!current || currentIsTask !== isTask) {
          result.push([item])
        } else {
          current.push(item)
        }
        return result
      }, [])
      return groups.map<ListBlock>((group) => ({
        id: createBlockId(),
        type:
          group[0].checked !== undefined
            ? 'task-list'
            : node.ordered
              ? 'ordered-list'
              : 'unordered-list',
        items: group,
      }))
    }
    case 'code':
      return [
        {
          id: createBlockId(),
          type: 'code',
          language: node.lang ?? undefined,
          code: node.value ?? '',
        },
      ]
    case 'thematicBreak':
      return [{ id: createBlockId(), type: 'divider' }]
    case 'table':
      return [
        {
          id: createBlockId(),
          type: 'table',
          hasHeader: true,
          columnWidths: (node.children?.[0]?.children ?? []).map(() => ''),
          rows: (node.children ?? []).map((row) =>
            (row.children ?? []).map((cell, index) => ({
              id: createBlockId(),
              html: inlineNodesToHtml(cell.children),
              rowspan: 1,
              colspan: 1,
              align: node.align?.[index] ?? 'left',
            })),
          ),
        },
      ]
    case 'html': {
      const table = tableFromHtml(node.value ?? '')
      return table
        ? [table]
        : [createParagraphBlock(sanitizeEditorHtml(node.value ?? ''))]
    }
    default:
      return [createParagraphBlock(escapeHtml(nodeText(node)))]
  }
}

export const parseMarkdownToBlocks = (markdown: string): EditorBlock[] => {
  try {
    const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown)
    const root = tree as unknown as MarkdownNode
    return ensureNonEmptyDocument(
      (root.children ?? []).flatMap((node) => nodeToBlocks(node)),
    )
  } catch {
    return [createParagraphBlock(escapeHtml(markdown))]
  }
}
