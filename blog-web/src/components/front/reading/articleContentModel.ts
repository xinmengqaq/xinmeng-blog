import type { Root } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

export type ArticleContentNode = {
  type: string
  value?: string
  depth?: number
  ordered?: boolean
  url?: string
  alt?: string | null
  lang?: string | null
  children?: ArticleContentNode[]
}

export type ArticleHeading = { id: string; level: 2 | 3; text: string }
export type ParsedArticleContent = {
  root: Root
  headings: ArticleHeading[]
  headingIds: Map<object, string>
}

const textOf = (node: ArticleContentNode): string =>
  node.value ?? node.alt ?? node.children?.map(textOf).join('') ?? ''

const slug = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '') || 'section'

export const parseArticleContent = (
  markdown: string,
  articleTitle?: string,
): ParsedArticleContent => {
  const root = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root
  const first = root.children[0] as unknown as ArticleContentNode | undefined
  if (
    articleTitle &&
    first?.type === 'heading' &&
    first.depth === 1 &&
    textOf(first).trim() === articleTitle.trim()
  ) {
    root.children = root.children.slice(1)
  }
  const headings: ArticleHeading[] = []
  const headingIds = new Map<object, string>()
  const counts = new Map<string, number>()

  for (const raw of root.children as unknown as ArticleContentNode[]) {
    if (raw.type !== 'heading' || (raw.depth !== 2 && raw.depth !== 3)) {
      continue
    }
    const text = textOf(raw)
    const base = slug(text)
    const count = (counts.get(base) ?? 0) + 1
    counts.set(base, count)
    const id = count === 1 ? base : `${base}-${count}`
    headingIds.set(raw, id)
    headings.push({ id, level: raw.depth, text })
  }

  return { root, headings, headingIds }
}
