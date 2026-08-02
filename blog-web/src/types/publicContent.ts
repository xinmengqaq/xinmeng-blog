export type PublicArticleListItem = {
  id: number
  title: string
  summary?: string | null
  coverUrl?: string | null
  categoryId?: number | null
  categoryName?: string | null
  isTop?: boolean | null
  isRecommend?: boolean | null
  viewCount?: number | null
  commentCount?: number | null
  likeCount?: number | null
  publishedAt?: string | null
}

export type PublicTag = {
  id: number
  name: string
  articleCount?: number | null
}

export type PublicCategory = {
  id: number
  name: string
  articleCount: number
}

export type PublicArticleDetail = PublicArticleListItem & {
  content?: string | null
  tags: PublicTag[]
}

export type PublicHome = {
  featuredArticles: PublicArticleListItem[]
  latestArticles: PublicArticleListItem[]
}

export type PublicArticlePageParams = {
  page: number
  size: number
  keyword?: string
  categoryId?: number
  tagIds?: number[]
  year?: number
  month?: number
}

export type ArchiveMonth = {
  month: number
  articleCount: number
}

export type ArchiveYear = {
  year: number
  months: ArchiveMonth[]
}

export type ArticleFilterMeta = {
  archives: ArchiveYear[]
}

export type ArticleLikeResult = {
  likeCount: number
}

export type ArticleLikeRateLimitDetails = {
  retryAfterSeconds: number
}
