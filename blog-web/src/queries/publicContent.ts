import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getArticleFilterMeta,
  getPublicArticleDetail,
  getPublicArticlePage,
  getPublicCategories,
  getPublicHome,
  getPublicTags,
  likePublicArticle,
} from '@/api/publicContent'
import type { PublicArticlePageParams } from '@/types/publicContent'
import {
  normalizePublicArticleFilters,
  type PublicArticleFilters,
} from '@/utils/publicArticleFilters'

export const publicContentQueryKeys = {
  all: ['public-content'] as const,
  home: () => [...publicContentQueryKeys.all, 'home'] as const,
  pages: () => [...publicContentQueryKeys.all, 'articles'] as const,
  page: (params: PublicArticlePageParams) =>
    [
      ...publicContentQueryKeys.pages(),
      normalizePublicArticleFilters(params),
    ] as const,
  details: () => [...publicContentQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...publicContentQueryKeys.details(), id] as const,
  categories: () => [...publicContentQueryKeys.all, 'categories'] as const,
  tags: () => [...publicContentQueryKeys.all, 'tags'] as const,
  filterMeta: () => [...publicContentQueryKeys.all, 'filter-meta'] as const,
}

export const usePublicHomeQuery = () =>
  useQuery({ queryKey: publicContentQueryKeys.home(), queryFn: getPublicHome })

export const usePublicArticlePageQuery = (params: PublicArticleFilters) =>
  useQuery({
    queryKey: publicContentQueryKeys.page(params),
    queryFn: () => getPublicArticlePage(params),
  })

export const usePublicArticleDetailQuery = (
  id: number,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: publicContentQueryKeys.detail(id),
    queryFn: () => getPublicArticleDetail(id),
    enabled: options?.enabled ?? true,
  })

export const usePublicCategoriesQuery = () =>
  useQuery({
    queryKey: publicContentQueryKeys.categories(),
    queryFn: getPublicCategories,
  })

export const usePublicTagsQuery = () =>
  useQuery({ queryKey: publicContentQueryKeys.tags(), queryFn: getPublicTags })

export const useArticleFilterMetaQuery = () =>
  useQuery({
    queryKey: publicContentQueryKeys.filterMeta(),
    queryFn: getArticleFilterMeta,
  })

export const useLikePublicArticleMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => likePublicArticle(id),
    onSuccess: (result, id) => {
      queryClient.setQueryData(publicContentQueryKeys.detail(id), (current) =>
        current && typeof current === 'object'
          ? { ...current, likeCount: result.likeCount }
          : current,
      )
      void queryClient.invalidateQueries({
        queryKey: publicContentQueryKeys.home(),
      })
      void queryClient.invalidateQueries({
        queryKey: publicContentQueryKeys.pages(),
      })
    },
  })
}
