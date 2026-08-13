import type { PageResult } from '@/types/api'
import type {
  ArticlePageQueryParams,
  ArticleSaveParams,
  ArticleVO,
  ArticleStatus,
  BatchDeleteArticlesResult,
  CreateArticleResult,
} from '@/types/article'
import { adminRequest } from '@/utils/request'

const toArticleQueryParams = (params: ArticlePageQueryParams) => ({
  page: params.page,
  size: params.size,
  ...(params.keyword ? { keyword: params.keyword } : {}),
  ...(params.status ? { status: params.status } : {}),
  ...(params.categoryId ? { categoryId: params.categoryId } : {}),
  ...(params.tagId ? { tagId: params.tagId } : {}),
})

export const getArticlePage = (params: ArticlePageQueryParams) =>
  adminRequest.get<PageResult<ArticleVO>>('/admin/articles', {
    params: toArticleQueryParams(params),
  })

export const getArticleDetail = (id: number) =>
  adminRequest.get<ArticleVO>(`/admin/articles/${id}`)

export const createArticle = (params: ArticleSaveParams) =>
  adminRequest.post<CreateArticleResult>('/admin/articles', params)

export const updateArticle = (id: number, params: ArticleSaveParams) =>
  adminRequest.put<ArticleVO>(`/admin/articles/${id}`, params)

export const deleteArticle = (id: number) =>
  adminRequest.delete<void>(`/admin/articles/${id}`)

export const batchDeleteArticles = (ids: number[]) =>
  adminRequest.post<BatchDeleteArticlesResult>('/admin/articles/batch-delete', {
    ids,
  })

export const updateArticleStatus = (id: number, status: ArticleStatus) =>
  adminRequest.patch<void>(`/admin/articles/${id}/status`, { status })

export const updateArticleTop = (id: number, isTop: boolean) =>
  adminRequest.patch<void>(`/admin/articles/${id}/top`, { isTop })

export const updateArticleRecommend = (id: number, isRecommend: boolean) =>
  adminRequest.patch<void>(`/admin/articles/${id}/recommend`, { isRecommend })
