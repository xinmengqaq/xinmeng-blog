import DOMPurify from 'dompurify'

import { createParagraphBlock } from '../core/blockModel'
import { parseMarkdownToBlocks } from '../markdown/parseMarkdown'
import { sanitizeEditorHtml } from '../markdown/sanitizeHtml'
import type { EditorBlock } from '../types'

type ClipboardSource = Pick<DataTransfer, 'getData' | 'types'>

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const inlineHtmlToMarkdown = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (!(node instanceof HTMLElement)) return ''
  const content = Array.from(node.childNodes).map(inlineHtmlToMarkdown).join('')
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
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a',
      'b',
      'blockquote',
      'br',
      'code',
      'col',
      'colgroup',
      'del',
      'div',
      'em',
      'h1',
      'h2',
      'h3',
      'h4',
      'i',
      'li',
      'ol',
      'p',
      'pre',
      's',
      'span',
      'strong',
      'table',
      'tbody',
      'td',
      'th',
      'thead',
      'tr',
      'u',
      'ul',
    ],
    ALLOWED_ATTR: ['href', 'style', 'rowspan', 'colspan'],
  })
  const document = new DOMParser().parseFromString(clean, 'text/html')
  const blockToMarkdown = (element: Element): string => {
    const tag = element.tagName.toLowerCase()
    if (tag === 'table') return sanitizeEditorHtml(element.outerHTML)
    if (/^h[1-4]$/.test(tag)) {
      return `${'#'.repeat(Number(tag[1]))} ${inlineHtmlToMarkdown(element)}`
    }
    if (tag === 'blockquote') {
      return inlineHtmlToMarkdown(element)
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    }
    if (tag === 'pre') return `\`\`\`\n${element.textContent ?? ''}\n\`\`\``
    if (tag === 'ul' || tag === 'ol') {
      return Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === 'li')
        .map(
          (child, index) =>
            `${tag === 'ol' ? `${index + 1}.` : '-'} ${inlineHtmlToMarkdown(child)}`,
        )
        .join('\n')
    }
    return inlineHtmlToMarkdown(element)
  }
  return Array.from(document.body.children).map(blockToMarkdown).join('\n\n')
}

const plainTextToBlocks = (text: string): EditorBlock[] =>
  text
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .filter(Boolean)
    .map((paragraph) => ({
      ...createParagraphBlock(),
      html: paragraph.split(/\r?\n/).map(escapeHtml).join('<br>'),
    }))

export const getClipboardBlocks = (clipboard: ClipboardSource) => {
  const types = Array.from(clipboard.types)
  if (types.includes('text/markdown')) {
    const markdown = clipboard.getData('text/markdown').trim()
    if (markdown) return parseMarkdownToBlocks(markdown)
  }
  if (types.includes('text/html')) {
    const markdown = htmlToMarkdown(clipboard.getData('text/html')).trim()
    if (markdown) return parseMarkdownToBlocks(markdown)
  }
  const text = clipboard.getData('text/plain')
  return text.trim() ? plainTextToBlocks(text) : []
}
