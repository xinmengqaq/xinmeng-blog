import type { ArticleStatus } from '@/types/article'
import { removeBlobImageUrlsFromContent } from '@/utils/articleImageMarkdown'
import { storage } from '@/utils/storage'

import type { ArticleForm } from './articleEditorForm'

const DRAFT_KEY_PREFIX = 'blog-web:article-editor-draft'

export const ARTICLE_EDITOR_DRAFT_INTERVAL_MS = 5 * 60 * 1000

export type ArticleEditorDraft = {
  form: ArticleForm
  savedAt: number
  omittedLocalImages: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isArticleStatus = (value: unknown): value is ArticleStatus =>
  value === 'draft' || value === 'published' || value === 'hidden'

const isArticleForm = (value: unknown): value is ArticleForm => {
  if (!isRecord(value)) return false
  return (
    typeof value.title === 'string' &&
    typeof value.summary === 'string' &&
    typeof value.coverUrl === 'string' &&
    isArticleStatus(value.status) &&
    typeof value.content === 'string' &&
    (value.categoryId === null ||
      (typeof value.categoryId === 'number' &&
        Number.isInteger(value.categoryId))) &&
    Array.isArray(value.tagIds) &&
    value.tagIds.every(
      (tagId): tagId is number =>
        typeof tagId === 'number' && Number.isInteger(tagId),
    ) &&
    typeof value.isTop === 'boolean' &&
    typeof value.isRecommend === 'boolean'
  )
}

const isArticleEditorDraft = (
  value: unknown,
): value is ArticleEditorDraft => {
  if (!isRecord(value)) return false
  return (
    isArticleForm(value.form) &&
    typeof value.savedAt === 'number' &&
    Number.isFinite(value.savedAt) &&
    value.savedAt >= 0 &&
    typeof value.omittedLocalImages === 'boolean'
  )
}

export const getArticleEditorDraftKey = (articleId: number | null) =>
  `${DRAFT_KEY_PREFIX}:${articleId === null ? 'new' : articleId}`

export const readArticleEditorDraft = (
  articleId: number | null,
): ArticleEditorDraft | null => {
  const key = getArticleEditorDraftKey(articleId)
  const value = storage.get<unknown>(key)
  if (value === null) return null
  if (isArticleEditorDraft(value)) return value
  storage.remove(key)
  return null
}

export const saveArticleEditorDraft = (
  articleId: number | null,
  form: ArticleForm,
  savedAt = Date.now(),
): void => {
  const content = removeBlobImageUrlsFromContent(form.content)
  const coverUrl = form.coverUrl.startsWith('blob:') ? '' : form.coverUrl
  const draft: ArticleEditorDraft = {
    form: {
      ...form,
      content,
      coverUrl,
      tagIds: [...form.tagIds],
    },
    savedAt,
    omittedLocalImages: content !== form.content || coverUrl !== form.coverUrl,
  }

  try {
    storage.set(getArticleEditorDraftKey(articleId), draft)
  } catch {
    // 本地缓存不可用时不影响继续编辑和提交文章。
  }
}

export const removeArticleEditorDraft = (articleId: number | null): void => {
  storage.remove(getArticleEditorDraftKey(articleId))
}
