import type { TagVO } from './taxonomy'

export type ArticleStatus = 'draft' | 'published' | 'hidden'

export type ArticleVO = {
  id: number
  categoryId?: number | null
  categoryName?: string | null
  tags?: TagVO[]
  title: string
  summary?: string | null
  content?: string | null
  coverUrl?: string | null
  status: ArticleStatus
  isTop?: boolean | null
  isRecommend?: boolean | null
  viewCount: number
  commentCount: number
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type ArticlePageQueryParams = {
  page: number
  size: number
  keyword?: string
  status?: ArticleStatus
  categoryId?: number
  tagId?: number
}

export type ArticleSaveParams = {
  title: string
  summary?: string
  content: string
  coverUrl?: string
  status: ArticleStatus
  categoryId?: number | null
  tagIds?: number[]
  isTop?: boolean
  isRecommend?: boolean
}

export type CreateArticleResult = {
  id: number
}

export type BatchDeleteArticlesResult = {
  deletedCount: number
}
