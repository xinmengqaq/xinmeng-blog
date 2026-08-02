import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  batchDeleteArticles,
  createArticle,
  deleteArticle,
  getArticleDetail,
  getArticlePage,
  updateArticle,
  updateArticleRecommend,
  updateArticleStatus,
  updateArticleTop,
} from '@/api/article'
import type {
  ArticlePageQueryParams,
  ArticleSaveParams,
  ArticleStatus,
  ArticleVO,
  BatchDeleteArticlesResult,
  CreateArticleResult,
} from '@/types/article'

const normalizeArticlePageParams = (params: ArticlePageQueryParams) => ({
  page: params.page,
  size: params.size,
  keyword: params.keyword ?? '',
  status: params.status ?? '',
  categoryId: params.categoryId ?? null,
  tagId: params.tagId ?? null,
})

export const articleQueryKeys = {
  all: ['articles'] as const,
  pages: () => [...articleQueryKeys.all, 'page'] as const,
  page: (params: ArticlePageQueryParams) =>
    [...articleQueryKeys.pages(), normalizeArticlePageParams(params)] as const,
  details: () => [...articleQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...articleQueryKeys.details(), id] as const,
}

export const useArticlePageQuery = (params: ArticlePageQueryParams) =>
  useQuery({
    queryKey: articleQueryKeys.page(params),
    queryFn: () => getArticlePage(params),
  })

export const useArticleDetailQuery = (
  id: number,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: articleQueryKeys.detail(id),
    queryFn: () => getArticleDetail(id),
    enabled: options?.enabled ?? true,
  })

export const useCreateArticleMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<CreateArticleResult, unknown, ArticleSaveParams>({
    mutationFn: (params) => createArticle(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: articleQueryKeys.pages(),
      })
    },
  })
}

export type UpdateArticleMutationParams = {
  id: number
  params: ArticleSaveParams
}

export const useUpdateArticleMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<ArticleVO, unknown, UpdateArticleMutationParams>({
    mutationFn: ({ id, params }) => updateArticle(id, params),
    onSuccess: (article, { id }) => {
      void queryClient.invalidateQueries({
        queryKey: articleQueryKeys.pages(),
      })
      queryClient.setQueryData(articleQueryKeys.detail(id), article)
      void queryClient.invalidateQueries({
        queryKey: articleQueryKeys.detail(id),
      })
    },
  })
}

export const useDeleteArticleMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, number>({
    mutationFn: (id) => deleteArticle(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: articleQueryKeys.pages(),
      })
    },
  })
}

const useInvalidateArticlePages = () => {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: articleQueryKeys.pages() })
}

export const useBatchDeleteArticlesMutation = () => {
  const invalidate = useInvalidateArticlePages()
  return useMutation<BatchDeleteArticlesResult, unknown, number[]>({
    mutationFn: batchDeleteArticles,
    onSuccess: invalidate,
  })
}

export const useUpdateArticleStatusMutation = () => {
  const invalidate = useInvalidateArticlePages()
  return useMutation<void, unknown, { id: number; status: ArticleStatus }>({
    mutationFn: ({ id, status }) => updateArticleStatus(id, status),
    onSuccess: invalidate,
  })
}

export const useUpdateArticleTopMutation = () => {
  const invalidate = useInvalidateArticlePages()
  return useMutation<void, unknown, { id: number; isTop: boolean }>({
    mutationFn: ({ id, isTop }) => updateArticleTop(id, isTop),
    onSuccess: invalidate,
  })
}

export const useUpdateArticleRecommendMutation = () => {
  const invalidate = useInvalidateArticlePages()
  return useMutation<void, unknown, { id: number; isRecommend: boolean }>({
    mutationFn: ({ id, isRecommend }) =>
      updateArticleRecommend(id, isRecommend),
    onSuccess: invalidate,
  })
}
