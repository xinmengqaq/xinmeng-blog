import type { Root } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

type MarkdownNode = {
  type: string
  value?: string
  identifier?: string
  children?: MarkdownNode[]
}

const calloutLabels: Record<string, string> = {
  abstract: '摘要',
  attention: '注意',
  bug: '问题',
  caution: '注意',
  danger: '危险',
  error: '错误',
  example: '示例',
  failure: '失败',
  faq: '问答',
  help: '帮助',
  info: '信息',
  note: '备注',
  question: '问题',
  quote: '引用',
  success: '成功',
  summary: '摘要',
  tip: '提示',
  todo: '待办',
  warning: '警告',
}

const collectReferences = (
  node: MarkdownNode,
  imageReferences: Set<string>,
  linkReferences: Set<string>,
) => {
  if (node.type === 'imageReference' && node.identifier) {
    imageReferences.add(node.identifier.toLowerCase())
  }
  if (node.type === 'linkReference' && node.identifier) {
    linkReferences.add(node.identifier.toLowerCase())
  }
  node.children?.forEach((child) =>
    collectReferences(child, imageReferences, linkReferences),
  )
}

const normalizeObsidianText = (value: string) =>
  value
    .replace(/!\[\[[^\]]+\]\]/g, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, alias) =>
      String(alias ?? target).trim(),
    )

const normalizeCallout = (node: MarkdownNode): MarkdownNode[] | null => {
  if (node.type !== 'blockquote') return null
  const [first, ...remaining] = node.children ?? []
  if (first?.type !== 'paragraph') return null
  const firstText = first.children?.find((child) => child.type === 'text')
  const marker = firstText?.value?.match(/^\[!([a-z0-9_-]+)\][+-]?\s*/i)
  if (!firstText || !marker) return null

  const type = marker[1].toLowerCase()
  const title = firstText.value?.slice(marker[0].length).trim() ?? ''
  const label = calloutLabels[type] ?? type
  firstText.value = title ? `${label}：${title}` : label
  return [{ ...node, children: [first] }, ...remaining]
}

const normalizeChildren = (
  children: MarkdownNode[],
  imageReferences: Set<string>,
  linkReferences: Set<string>,
): MarkdownNode[] =>
  children.flatMap((node) => {
    if (node.type === 'image' || node.type === 'imageReference') return []
    if (
      node.type === 'definition' &&
      node.identifier &&
      imageReferences.has(node.identifier.toLowerCase()) &&
      !linkReferences.has(node.identifier.toLowerCase())
    ) {
      return []
    }

    if (node.type === 'text' && node.value) {
      node.value = normalizeObsidianText(node.value)
    }
    if (node.children) {
      node.children = normalizeChildren(
        node.children,
        imageReferences,
        linkReferences,
      )
    }
    if (node.type === 'paragraph' && node.children?.length === 0) return []

    return normalizeCallout(node) ?? [node]
  })

export const normalizeArticleMarkdownImport = (markdown: string) => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify, { bullet: '-', fences: true })
  const root = processor.parse(markdown) as unknown as MarkdownNode
  const imageReferences = new Set<string>()
  const linkReferences = new Set<string>()
  collectReferences(root, imageReferences, linkReferences)
  root.children = normalizeChildren(
    root.children ?? [],
    imageReferences,
    linkReferences,
  )
  return processor.stringify(root as unknown as Root).trim()
}

export const readArticleMarkdownFile = async (file: File) => {
  if (!file.name.toLowerCase().endsWith('.md')) {
    throw new Error('请选择 .md 文件')
  }

  let markdown: string
  try {
    markdown = await file.text()
  } catch {
    throw new Error('无法读取 Markdown 文件，请重新选择')
  }

  try {
    const result = normalizeArticleMarkdownImport(
      markdown.replace(/^\uFEFF/, ''),
    )
    if (!result) throw new Error('empty')
    return result
  } catch {
    throw new Error('Markdown 文件没有可导入的正文')
  }
}
