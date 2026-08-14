import type {
  ArticleSaveParams,
  ArticleStatus,
  ArticleVO,
} from '@/types/article'

export type ArticleForm = {
  title: string
  summary: string
  coverUrl: string
  status: ArticleStatus
  content: string
  categoryId: number | null
  tagIds: number[]
  isTop: boolean
  isRecommend: boolean
}

export type ArticleFormErrors = Partial<Record<keyof ArticleForm, string>>

export const emptyArticleForm: ArticleForm = {
  title: '',
  summary: '',
  coverUrl: '',
  status: 'draft',
  content: '',
  categoryId: null,
  tagIds: [],
  isTop: false,
  isRecommend: false,
}

export const validateArticleForm = (form: ArticleForm) => {
  const errors: ArticleFormErrors = {}
  if (!form.title.trim()) errors.title = '标题不能为空'
  if (!form.content.trim()) errors.content = '正文不能为空'
  return errors
}

export const toArticleForm = (
  article: Partial<ArticleVO>,
  fallback: Partial<ArticleSaveParams> = {},
): ArticleForm => ({
  title: article.title ?? fallback.title ?? '',
  summary: article.summary ?? fallback.summary ?? '',
  coverUrl: article.coverUrl ?? fallback.coverUrl ?? '',
  status: article.status ?? fallback.status ?? 'draft',
  content: article.content ?? fallback.content ?? '',
  categoryId: article.categoryId ?? fallback.categoryId ?? null,
  tagIds: article.tags?.map((tag) => tag.id) ?? fallback.tagIds ?? [],
  isTop: article.isTop ?? fallback.isTop ?? false,
  isRecommend: article.isRecommend ?? fallback.isRecommend ?? false,
})

export const toArticleSaveParams = (form: ArticleForm): ArticleSaveParams => ({
  title: form.title.trim(),
  summary: form.summary.trim() || undefined,
  content: form.content,
  coverUrl: form.coverUrl.trim() || undefined,
  status: form.status,
  categoryId: form.categoryId,
  tagIds: form.tagIds,
  isTop: form.isTop,
  isRecommend: form.isRecommend,
})
