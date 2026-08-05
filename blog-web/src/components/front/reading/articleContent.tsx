import { createElement, type CSSProperties, type ReactNode } from 'react'

import { FrontIcon } from '@/components/front/visual'
import { sanitizeAuthorHtml } from '@/utils/authorHtml'

import { CodeBlock } from './CodeBlock'
import type {
  ArticleContentNode as Node,
  ParsedArticleContent,
} from './articleContentModel'

const safeUrl = (url?: string) => {
  if (!url) return '#'
  return /^(https?:|mailto:|\/|#)/i.test(url) ? url : '#'
}

const inlineOpening = (node: Node) =>
  node.type === 'html'
    ? (node.value?.match(/^<(span|u)\b[^>]*>$/i) ?? null)
    : null

const findClosing = (nodes: Node[], start: number, tagName: string) => {
  let depth = 1
  for (let index = start + 1; index < nodes.length; index += 1) {
    const value = nodes[index].type === 'html' ? (nodes[index].value ?? '') : ''
    if (value.match(new RegExp(`^<${tagName}\\b[^>]*>$`, 'i'))) depth += 1
    if (value.match(new RegExp(`^</${tagName}>$`, 'i'))) depth -= 1
    if (depth === 0) return index
  }
  return -1
}

const safeInlineStyle = (openingTag: string, tagName: string) => {
  const clean = sanitizeAuthorHtml(`${openingTag}content</${tagName}>`)
  const document = new DOMParser().parseFromString(clean, 'text/html')
  const element = document.body.firstElementChild as HTMLElement | null
  if (!element || element.tagName.toLowerCase() !== tagName) return undefined
  const style: CSSProperties = {}
  if (element.style.color) style.color = element.style.color
  if (element.style.backgroundColor) {
    style.backgroundColor = element.style.backgroundColor
  }
  if (element.style.textAlign) {
    style.textAlign = element.style.textAlign as CSSProperties['textAlign']
  }
  if (element.style.width) style.width = element.style.width
  return style
}

const renderSafeHtmlBlock = (html: string, key: string) => {
  const clean = sanitizeAuthorHtml(html)
  if (!clean) return null
  const document = new DOMParser().parseFromString(clean, 'text/html')
  if (!document.body.querySelector('table')) return null
  return (
    <div
      className="reading-table"
      dangerouslySetInnerHTML={{ __html: clean }}
      key={key}
    />
  )
}

const structuralNodeTypes = new Set([
  'text',
  'paragraph',
  'heading',
  'strong',
  'emphasis',
  'delete',
  'inlineCode',
  'blockquote',
  'list',
  'listItem',
])

const renderStructuralNode = (
  node: Node,
  children: ReactNode[],
  parsed: ParsedArticleContent,
  key: string,
) => {
  switch (node.type) {
    case 'text':
      return node.value
    case 'paragraph':
      return <p key={key}>{children}</p>
    case 'heading': {
      const Tag = `h${node.depth}` as 'h1' | 'h2' | 'h3' | 'h4'
      return (
        <Tag id={parsed.headingIds.get(node)} key={key}>
          {children}
        </Tag>
      )
    }
    case 'strong':
      return <strong key={key}>{children}</strong>
    case 'emphasis':
      return <em key={key}>{children}</em>
    case 'delete':
      return <s key={key}>{children}</s>
    case 'inlineCode':
      return <code key={key}>{node.value}</code>
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>
    case 'list': {
      const Tag = node.ordered ? 'ol' : 'ul'
      return <Tag key={key}>{children}</Tag>
    }
    case 'listItem':
      return <li key={key}>{children}</li>
    default:
      return null
  }
}

const renderRichNode = (node: Node, children: ReactNode[], key: string) => {
  switch (node.type) {
    case 'link': {
      const external = node.url?.startsWith('http')
      return (
        <a
          key={key}
          href={safeUrl(node.url)}
          target={external ? '_blank' : undefined}
          rel="noreferrer"
        >
          {children}
          {external ? <FrontIcon name="externalLink" size={16} /> : null}
        </a>
      )
    }
    case 'image':
      return (
        <img
          key={key}
          src={safeUrl(node.url)}
          alt={node.alt ?? ''}
          loading="lazy"
        />
      )
    case 'code':
      return (
        <CodeBlock key={key} code={node.value ?? ''} language={node.lang} />
      )
    case 'thematicBreak':
      return <hr key={key} />
    case 'table':
      return (
        <div className="reading-table" key={key}>
          <table>
            <tbody>{children}</tbody>
          </table>
        </div>
      )
    case 'tableRow':
      return <tr key={key}>{children}</tr>
    case 'tableCell':
      return <td key={key}>{children}</td>
    case 'break':
      return <br key={key} />
    case 'html':
      return renderSafeHtmlBlock(node.value ?? '', key)
    default:
      return <span key={key}>{children}</span>
  }
}

const renderNode = (
  node: Node,
  children: ReactNode[],
  parsed: ParsedArticleContent,
  key: string,
) =>
  structuralNodeTypes.has(node.type)
    ? renderStructuralNode(node, children, parsed, key)
    : renderRichNode(node, children, key)

const renderNodes = (
  nodes: Node[] = [],
  parsed: ParsedArticleContent,
  path = 'n',
): ReactNode[] => {
  const rendered: ReactNode[] = []
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    const key = `${path}-${index}`
    const opening = inlineOpening(node)
    if (opening) {
      const tagName = opening[1].toLowerCase()
      const closingIndex = findClosing(nodes, index, tagName)
      if (closingIndex !== -1) {
        rendered.push(
          createElement(
            tagName,
            { key, style: safeInlineStyle(node.value ?? '', tagName) },
            renderNodes(nodes.slice(index + 1, closingIndex), parsed, key),
          ),
        )
        index = closingIndex
        continue
      }
    }
    const children = renderNodes(node.children, parsed, key)
    rendered.push(renderNode(node, children, parsed, key))
  }
  return rendered
}

export const ArticleContent = ({
  parsed,
}: {
  parsed: ParsedArticleContent
}) => (
  <div className="reading-content">
    {renderNodes(parsed.root.children as unknown as Node[], parsed)}
  </div>
)
