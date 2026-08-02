import type { EditorBlock, TableBlock, TextAlign } from '../types'
import { getTableDimensions } from '../core/commands'
import { sanitizeEditorHtml } from './sanitizeHtml'

const escapeMarkdownText = (value: string) => value.replaceAll('|', '\\|')

const htmlNodeToMarkdown = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }
  if (!(node instanceof HTMLElement)) {
    return ''
  }

  const content = Array.from(node.childNodes).map(htmlNodeToMarkdown).join('')
  switch (node.tagName.toLowerCase()) {
    case 'strong':
    case 'b':
      return `**${content}**`
    case 'em':
    case 'i':
      return `*${content}*`
    case 'u':
      return `<u>${content}</u>`
    case 's':
    case 'del':
      return `~~${content}~~`
    case 'code':
      return `\`${content}\``
    case 'a':
      return `[${content}](${node.getAttribute('href') ?? ''})`
    case 'br':
      return '  \n'
    case 'span':
      return sanitizeEditorHtml(node.outerHTML)
    default:
      return content
  }
}

const htmlToMarkdown = (html: string) => {
  const document = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(document.body.childNodes).map(htmlNodeToMarkdown).join('')
}

const alignMarker = (align: TextAlign) => {
  if (align === 'center') return ':---:'
  if (align === 'right') return '---:'
  return '---'
}

const isSimpleTable = (table: TableBlock) =>
  table.rows.length > 0 &&
  table.rows.every((row) =>
    row.every((cell) => cell.rowspan === 1 && cell.colspan === 1),
  ) &&
  table.columnWidths.every((width) => !width)

const serializeGfmTable = (table: TableBlock) => {
  const columns = Math.max(...table.rows.map((row) => row.length))
  const rows = table.rows.map((row) =>
    Array.from({ length: columns }, (_, index) =>
      escapeMarkdownText(htmlToMarkdown(row[index]?.html ?? '')),
    ),
  )
  const header = table.hasHeader ? rows[0] : Array(columns).fill('')
  const body = table.hasHeader ? rows.slice(1) : rows
  const alignments = Array.from(
    { length: columns },
    (_, index) => table.rows[0]?.[index]?.align ?? 'left',
  )
  return [
    `| ${header.join(' | ')} |`,
    `| ${alignments.map(alignMarker).join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n')
}

const serializeHtmlTable = (table: TableBlock) => {
  const columns = getTableDimensions(table).columns
  const colgroup = table.columnWidths.some(Boolean)
    ? `<colgroup>${Array.from({ length: columns }, (_, index) => {
        const width = table.columnWidths[index]
        return width ? `<col style="width:${width}">` : '<col>'
      }).join('')}</colgroup>`
    : ''
  const rowHtml = (row: TableBlock['rows'][number], tag: 'th' | 'td') =>
    `<tr>${row
      .map((cell) => {
        const attributes = [
          cell.rowspan > 1 ? `rowspan="${cell.rowspan}"` : '',
          cell.colspan > 1 ? `colspan="${cell.colspan}"` : '',
          cell.align !== 'left' ? `style="text-align:${cell.align}"` : '',
        ]
          .filter(Boolean)
          .join(' ')
        return `<${tag}${attributes ? ` ${attributes}` : ''}>${cell.html}</${tag}>`
      })
      .join('')}</tr>`
  const header =
    table.hasHeader && table.rows[0]
      ? `<thead>${rowHtml(table.rows[0], 'th')}</thead>`
      : ''
  const bodyRows = table.hasHeader ? table.rows.slice(1) : table.rows
  return sanitizeEditorHtml(
    `<table>${colgroup}${header}<tbody>${bodyRows
      .map((row) => rowHtml(row, 'td'))
      .join('')}</tbody></table>`,
  )
}

const serializeBlock = (block: EditorBlock) => {
  switch (block.type) {
    case 'paragraph':
      return htmlToMarkdown(block.html)
    case 'heading':
      return `${'#'.repeat(block.level)} ${htmlToMarkdown(block.html)}`
    case 'quote':
      return htmlToMarkdown(block.html)
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    case 'unordered-list':
    case 'ordered-list':
    case 'task-list':
      return block.items
        .map((item, index) => {
          const indent = '  '.repeat(item.indent)
          const marker =
            block.type === 'ordered-list'
              ? `${index + 1}.`
              : block.type === 'task-list'
                ? `- [${item.checked ? 'x' : ' '}]`
                : '-'
          return `${indent}${marker} ${htmlToMarkdown(item.html)}`
        })
        .join('\n')
    case 'code':
      return `\`\`\`${block.language ?? ''}\n${block.code}\n\`\`\``
    case 'image':
      return `![${block.alt ?? ''}](${block.url})`
    case 'table':
      return isSimpleTable(block)
        ? serializeGfmTable(block)
        : serializeHtmlTable(block)
    case 'divider':
      return '---'
  }
}

export const serializeBlocksToMarkdown = (blocks: EditorBlock[]) =>
  blocks.map(serializeBlock).join('\n\n').trim()
