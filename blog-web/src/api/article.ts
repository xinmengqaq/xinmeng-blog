import type { PageResult } from '@/types/api'
import type {
  ArticlePageQueryParams,
  ArticleSaveParams,
  ArticleVO,
  ArticleStatus,
  BatchDeleteArticlesResult,
  CreateArticleResult,
} from '@/types/article'
import { request } from '@/utils/request'

const toArticleQueryParams = (params: ArticlePageQueryParams) => ({
  page: params.page,
  size: params.size,
  ...(params.keyword ? { keyword: params.keyword } : {}),
  ...(params.status ? { status: params.status } : {}),
  ...(params.categoryId ? { categoryId: params.categoryId } : {}),
  ...(params.tagId ? { tagId: params.tagId } : {}),
})

export const getArticlePage = (params: ArticlePageQueryParams) =>
  request.get<PageResult<ArticleVO>>('/admin/articles', {
    params: toArticleQueryParams(params),
  })

export const getArticleDetail = (id: number) =>
  request.get<ArticleVO>(`/admin/articles/${id}`)

export const createArticle = (params: ArticleSaveParams) =>
  request.post<CreateArticleResult>('/admin/articles', params)

export const updateArticle = (id: number, params: ArticleSaveParams) =>
  request.put<ArticleVO>(`/admin/articles/${id}`, params)

export const deleteArticle = (id: number) =>
  request.delete<void>(`/admin/articles/${id}`)

export const batchDeleteArticles = (ids: number[]) =>
  request.post<BatchDeleteArticlesResult>('/admin/articles/batch-delete', {
    ids,
  })

export const updateArticleStatus = (id: number, status: ArticleStatus) =>
  request.patch<void>(`/admin/articles/${id}/status`, { status })

export const updateArticleTop = (id: number, isTop: boolean) =>
  request.patch<void>(`/admin/articles/${id}/top`, { isTop })

export const updateArticleRecommend = (id: number, isRecommend: boolean) =>
  request.patch<void>(`/admin/articles/${id}/recommend`, { isRecommend })
