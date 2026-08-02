import type { PageResult } from '@/types/api'
import type {
  ArticleFilterMeta,
  ArticleLikeResult,
  PublicArticleDetail,
  PublicArticleListItem,
  PublicArticlePageParams,
  PublicCategory,
  PublicHome,
  PublicTag,
} from '@/types/publicContent'
import { request } from '@/utils/request'

const isValidYear = (year: number | undefined): year is number =>
  Number.isInteger(year) && year! >= 1970 && year! <= 9999

const isValidMonth = (month: number | undefined): month is number =>
  Number.isInteger(month) && month! >= 1 && month! <= 12

const toArticlePageRequestParams = (params: PublicArticlePageParams) => {
  const keyword = params.keyword?.trim()
  const tagIds = [...new Set(params.tagIds?.filter((id) => id > 0) ?? [])].sort(
    (left, right) => left - right,
  )
  const year = isValidYear(params.year) ? params.year : undefined

  return {
    page: params.page,
    size: params.size,
    ...(keyword ? { keyword } : {}),
    ...(params.categoryId && params.categoryId > 0
      ? { categoryId: params.categoryId }
      : {}),
    ...(tagIds.length > 0 ? { tagIds: tagIds.join(',') } : {}),
    ...(year ? { year } : {}),
    ...(year && isValidMonth(params.month) ? { month: params.month } : {}),
  }
}

export const getPublicHome = () => request.get<PublicHome>('/home')

export const getPublicArticlePage = (params: PublicArticlePageParams) =>
  request.get<PageResult<PublicArticleListItem>>('/articles', {
    params: toArticlePageRequestParams(params),
  })

export const getArticleFilterMeta = () =>
  request.get<ArticleFilterMeta>('/articles/meta')

export const getPublicArticleDetail = (id: number) =>
  request.get<PublicArticleDetail>(`/articles/${id}`)

export const getPublicCategories = () =>
  request.get<PublicCategory[]>('/categories')

export const getPublicTags = () => request.get<PublicTag[]>('/tags')

export const likePublicArticle = (id: number) =>
  request.post<ArticleLikeResult>(`/articles/${id}/like`)
