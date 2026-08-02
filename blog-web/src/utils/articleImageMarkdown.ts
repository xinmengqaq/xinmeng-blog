import type { Root } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

type MarkdownNode = {
  type: string
  url?: string
  children?: MarkdownNode[]
}

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkStringify)

export function extractImageUrlsFromContent(content: string): string[] {
  const urls = new Set<string>()
  forEachImageNode(parseMarkdown(content), (node) => {
    urls.add(node.url)
  })
  return [...urls]
}

export function replaceImageUrlsInContent(
  content: string,
  urlMap: Map<string, string>,
): string {
  if (urlMap.size === 0) return content

  const root = parseMarkdown(content)
  let changed = false
  forEachImageNode(root, (node) => {
    const replacement = urlMap.get(node.url)
    if (replacement) {
      node.url = replacement
      changed = true
    }
  })

  return changed ? markdownProcessor.stringify(root) : content
}

export function getRemovedImageUrls(
  initialContent: string,
  currentContent: string,
): string[] {
  const currentUrls = new Set(extractImageUrlsFromContent(currentContent))
  return extractImageUrlsFromContent(initialContent).filter(
    (url) => !url.startsWith('blob:') && !currentUrls.has(url),
  )
}

function parseMarkdown(content: string): Root {
  return markdownProcessor.parse(content)
}

function forEachImageNode(
  root: MarkdownNode,
  visit: (node: Required<Pick<MarkdownNode, 'url'>>) => void,
): void {
  if (root.type === 'image' && root.url) {
    visit(root as Required<Pick<MarkdownNode, 'url'>>)
  }
  root.children?.forEach((child) => forEachImageNode(child, visit))
}
