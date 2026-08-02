import type { ContentImageCleanupResponse, FileUploadResult } from '@/api/file'
import type {
  ArticleSaveParams,
  ArticleVO,
  CreateArticleResult,
} from '@/types/article'
import type { ArticleCoverChange, ImageDraft } from '@/types/file'
import {
  extractImageUrlsFromContent,
  getRemovedImageUrls,
  replaceImageUrlsInContent,
} from '@/utils/articleImageMarkdown'

export type ArticleImageSaveDependencies = {
  cleanupContentImage: (fileUrl: string) => Promise<ContentImageCleanupResponse>
  createArticle: (payload: ArticleSaveParams) => Promise<CreateArticleResult>
  getArticle: (articleId: number) => Promise<ArticleVO>
  removeArticleCover: (articleId: number) => Promise<void>
  updateArticle: (
    articleId: number,
    payload: ArticleSaveParams,
  ) => Promise<ArticleVO>
  uploadArticleCover: (
    articleId: number,
    draft: ImageDraft,
  ) => Promise<FileUploadResult>
  uploadContentImage: (draft: ImageDraft) => Promise<FileUploadResult>
}

export type ArticleSaveCheckpoint = {
  article: ArticleVO | null
  articleId: number | null
  articleSaved: boolean
  contentUrlMap: Map<string, string>
  pendingCleanupUrls: string[]
  retainedInUseUrls: string[]
  savedPayload: ArticleSaveParams | null
}

type ArticleImageSaveParams = {
  articleId: number | null
  checkpoint: ArticleSaveCheckpoint
  contentDrafts: ReadonlyMap<string, ImageDraft>
  coverChange: ArticleCoverChange | null
  initialContent: string
  mode: 'create' | 'edit'
  payload: ArticleSaveParams
}

export type ArticleImageSaveResult = {
  article: ArticleVO | null
  articleId: number
  payload: ArticleSaveParams
  retainedInUseUrls: string[]
}

export const createArticleSaveCheckpoint = (): ArticleSaveCheckpoint => ({
  article: null,
  articleId: null,
  articleSaved: false,
  contentUrlMap: new Map(),
  pendingCleanupUrls: [],
  retainedInUseUrls: [],
  savedPayload: null,
})

const samePayload = (
  left: ArticleSaveParams | null,
  right: ArticleSaveParams,
) => left !== null && JSON.stringify(left) === JSON.stringify(right)

const assertConfirmedImageUrls = (
  content: string,
  initialContent: string,
  confirmedUrls: Iterable<string>,
) => {
  const allowed = new Set([
    ...extractImageUrlsFromContent(initialContent),
    ...confirmedUrls,
  ])
  const invalid = extractImageUrlsFromContent(content).some(
    (url) => !allowed.has(url),
  )
  if (invalid) {
    throw new Error('请使用“上传图片”按钮添加正文图片')
  }
}

const uploadNewContentDrafts = async (
  drafts: ReadonlyMap<string, ImageDraft>,
  existingMap: ReadonlyMap<string, string>,
  upload: ArticleImageSaveDependencies['uploadContentImage'],
  cleanup: ArticleImageSaveDependencies['cleanupContentImage'],
) => {
  const urlMap = new Map(existingMap)
  const uploadedUrls: string[] = []
  try {
    for (const [previewUrl, draft] of drafts) {
      if (urlMap.has(previewUrl)) continue
      const result = await upload(draft)
      urlMap.set(previewUrl, result.file_url)
      uploadedUrls.push(result.file_url)
    }
  } catch (error) {
    await Promise.allSettled(uploadedUrls.map((url) => cleanup(url)))
    throw error
  }
  return { uploadedUrls, urlMap }
}

const compensateUploads = async (
  urls: string[],
  cleanup: ArticleImageSaveDependencies['cleanupContentImage'],
) => {
  await Promise.allSettled(urls.map((url) => cleanup(url)))
}

const saveSpringArticle = async (
  params: ArticleImageSaveParams,
  payload: ArticleSaveParams,
  dependencies: ArticleImageSaveDependencies,
) => {
  const checkpoint = params.checkpoint
  if (checkpoint.articleSaved && checkpoint.articleId !== null) {
    if (samePayload(checkpoint.savedPayload, payload)) return
    checkpoint.article = await dependencies.updateArticle(
      checkpoint.articleId,
      payload,
    )
    return
  }
  if (params.mode === 'create') {
    checkpoint.articleId = (await dependencies.createArticle(payload)).id
  } else if (params.articleId !== null) {
    checkpoint.articleId = params.articleId
    checkpoint.article = await dependencies.updateArticle(
      params.articleId,
      payload,
    )
  } else {
    throw new Error('文章 ID 无效')
  }
}

const cleanupRemovedImages = async (
  checkpoint: ArticleSaveCheckpoint,
  cleanup: ArticleImageSaveDependencies['cleanupContentImage'],
) => {
  while (checkpoint.pendingCleanupUrls.length > 0) {
    const fileUrl = checkpoint.pendingCleanupUrls[0]
    const response = await cleanup(fileUrl)
    if (response.result === 'retained_in_use') {
      checkpoint.retainedInUseUrls.push(fileUrl)
    }
    checkpoint.pendingCleanupUrls.shift()
  }
}

const saveCover = async (
  articleId: number,
  change: ArticleCoverChange | null,
  payload: ArticleSaveParams,
  dependencies: ArticleImageSaveDependencies,
) => {
  if (change?.kind === 'upload') {
    return (await dependencies.uploadArticleCover(articleId, change.draft))
      .file_url
  }
  if (change?.kind === 'remove') {
    await dependencies.removeArticleCover(articleId)
    return undefined
  }
  return payload.coverUrl
}

export const saveArticleWithImages = async (
  params: ArticleImageSaveParams,
  dependencies: ArticleImageSaveDependencies,
): Promise<ArticleImageSaveResult> => {
  const checkpoint = params.checkpoint
  const baselineContent =
    checkpoint.savedPayload?.content ?? params.initialContent
  const referencedDraftUrls = new Set(
    extractImageUrlsFromContent(params.payload.content),
  )
  const referencedDrafts = new Map(
    [...params.contentDrafts].filter(([url]) => referencedDraftUrls.has(url)),
  )
  const { uploadedUrls, urlMap } = await uploadNewContentDrafts(
    referencedDrafts,
    checkpoint.contentUrlMap,
    dependencies.uploadContentImage,
    dependencies.cleanupContentImage,
  )

  let payload: ArticleSaveParams
  try {
    const content = replaceImageUrlsInContent(params.payload.content, urlMap)
    assertConfirmedImageUrls(content, baselineContent, urlMap.values())
    payload = { ...params.payload, content }
    await saveSpringArticle(params, payload, dependencies)
  } catch (error) {
    await compensateUploads(uploadedUrls, dependencies.cleanupContentImage)
    throw error
  }

  const articleId = checkpoint.articleId
  if (articleId === null) throw new Error('保存文章后未取得真实文章 ID')
  const removedUrls = getRemovedImageUrls(baselineContent, payload.content)
  checkpoint.articleSaved = true
  checkpoint.contentUrlMap = urlMap
  checkpoint.pendingCleanupUrls = [
    ...new Set([...checkpoint.pendingCleanupUrls, ...removedUrls]),
  ]
  checkpoint.savedPayload = payload

  await cleanupRemovedImages(checkpoint, dependencies.cleanupContentImage)
  const coverUrl = await saveCover(
    articleId,
    params.coverChange,
    payload,
    dependencies,
  )
  checkpoint.savedPayload = { ...payload, coverUrl }
  checkpoint.article = await dependencies.getArticle(articleId)

  return {
    article: checkpoint.article,
    articleId,
    payload: checkpoint.savedPayload,
    retainedInUseUrls: [...checkpoint.retainedInUseUrls],
  }
}
