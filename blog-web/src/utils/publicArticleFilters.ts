import type { PublicArticlePageParams } from '@/types/publicContent'

export type PublicArticleFilters = {
  page: number
  size: number
  keyword: string
  categoryId?: number
  tagIds: number[]
  year?: number
  month?: number
}

export const DEFAULT_PUBLIC_ARTICLE_FILTERS: PublicArticleFilters = {
  page: 1,
  size: 10,
  keyword: '',
  categoryId: undefined,
  tagIds: [],
  year: undefined,
  month: undefined,
}

const integer = (value: string | null) => {
  if (!value || !/^\d+$/.test(value)) return undefined
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

export const normalizePublicArticleFilters = (
  input: Partial<PublicArticlePageParams>,
): PublicArticleFilters => {
  const inputPage = input.page
  const inputSize = input.size
  const inputYear = input.year
  const inputMonth = input.month
  const inputCategoryId = input.categoryId
  const page =
    typeof inputPage === 'number' &&
    Number.isInteger(inputPage) &&
    inputPage > 0
      ? inputPage
      : 1
  const size =
    typeof inputSize === 'number' &&
    Number.isInteger(inputSize) &&
    inputSize > 0
      ? inputSize
      : 10
  const year =
    typeof inputYear === 'number' &&
    Number.isInteger(inputYear) &&
    inputYear >= 1970 &&
    inputYear <= 9999
      ? inputYear
      : undefined
  const month =
    year &&
    typeof inputMonth === 'number' &&
    Number.isInteger(inputMonth) &&
    inputMonth >= 1 &&
    inputMonth <= 12
      ? inputMonth
      : undefined
  const tagIds = [
    ...new Set(
      input.tagIds?.filter((id) => Number.isInteger(id) && id > 0) ?? [],
    ),
  ].sort((left, right) => left - right)

  return {
    page,
    size,
    keyword: input.keyword?.trim() ?? '',
    categoryId:
      typeof inputCategoryId === 'number' &&
      Number.isInteger(inputCategoryId) &&
      inputCategoryId > 0
        ? inputCategoryId
        : undefined,
    tagIds,
    year,
    month,
  }
}

export const parsePublicArticleFilters = (
  searchParams: URLSearchParams,
): PublicArticleFilters =>
  normalizePublicArticleFilters({
    page: integer(searchParams.get('page')),
    size: integer(searchParams.get('size')),
    keyword: searchParams.get('keyword') ?? '',
    categoryId: integer(searchParams.get('categoryId')),
    tagIds: (searchParams.get('tagIds') ?? '')
      .split(',')
      .map(integer)
      .filter((id): id is number => id !== undefined),
    year: integer(searchParams.get('year')),
    month: integer(searchParams.get('month')),
  })

export const serializePublicArticleFilters = (
  filters: PublicArticleFilters,
) => {
  const normalized = normalizePublicArticleFilters(filters)
  const searchParams = new URLSearchParams()
  if (normalized.page !== 1) searchParams.set('page', String(normalized.page))
  if (normalized.size !== 10) searchParams.set('size', String(normalized.size))
  if (normalized.keyword) searchParams.set('keyword', normalized.keyword)
  if (normalized.categoryId) {
    searchParams.set('categoryId', String(normalized.categoryId))
  }
  if (normalized.tagIds.length > 0) {
    searchParams.set('tagIds', normalized.tagIds.join(','))
  }
  if (normalized.year) searchParams.set('year', String(normalized.year))
  if (normalized.month) searchParams.set('month', String(normalized.month))
  return searchParams
}

export const updatePublicArticleFilters = (
  current: PublicArticleFilters,
  changes: Partial<PublicArticlePageParams>,
) => normalizePublicArticleFilters({ ...current, ...changes, page: 1 })
