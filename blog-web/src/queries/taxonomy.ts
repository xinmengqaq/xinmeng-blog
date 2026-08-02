import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  getCategories,
  getTags,
  updateCategory,
  updateTag,
} from '@/api/taxonomy'
import type {
  CategorySaveParams,
  CategoryStatus,
  CategoryVO,
  CreateTaxonomyResult,
  TagSaveParams,
  TagVO,
} from '@/types/taxonomy'

export const taxonomyQueryKeys = {
  all: ['taxonomy'] as const,
  categories: (status: CategoryStatus | '') =>
    [...taxonomyQueryKeys.all, 'categories', status] as const,
  tags: (keyword: string) =>
    [...taxonomyQueryKeys.all, 'tags', keyword] as const,
}

export const useCategoriesQuery = (status: CategoryStatus | '' = '') =>
  useQuery({
    queryKey: taxonomyQueryKeys.categories(status),
    queryFn: () => getCategories(status),
  })

export const useTagsQuery = (keyword = '') =>
  useQuery({
    queryKey: taxonomyQueryKeys.tags(keyword),
    queryFn: () => getTags(keyword),
  })

const useInvalidateTaxonomy = () => {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.all })
}

export const useCreateCategoryMutation = () => {
  const invalidate = useInvalidateTaxonomy()
  return useMutation<CreateTaxonomyResult, unknown, CategorySaveParams>({
    mutationFn: createCategory,
    onSuccess: invalidate,
  })
}

export const useUpdateCategoryMutation = () => {
  const invalidate = useInvalidateTaxonomy()
  return useMutation<
    CategoryVO,
    unknown,
    { id: number; params: CategorySaveParams }
  >({
    mutationFn: ({ id, params }) => updateCategory(id, params),
    onSuccess: invalidate,
  })
}

export const useDeleteCategoryMutation = () => {
  const invalidate = useInvalidateTaxonomy()
  return useMutation<void, unknown, number>({
    mutationFn: deleteCategory,
    onSuccess: invalidate,
  })
}

export const useCreateTagMutation = () => {
  const invalidate = useInvalidateTaxonomy()
  return useMutation<CreateTaxonomyResult, unknown, TagSaveParams>({
    mutationFn: createTag,
    onSuccess: invalidate,
  })
}

export const useUpdateTagMutation = () => {
  const invalidate = useInvalidateTaxonomy()
  return useMutation<TagVO, unknown, { id: number; params: TagSaveParams }>({
    mutationFn: ({ id, params }) => updateTag(id, params),
    onSuccess: invalidate,
  })
}

export const useDeleteTagMutation = () => {
  const invalidate = useInvalidateTaxonomy()
  return useMutation<void, unknown, number>({
    mutationFn: deleteTag,
    onSuccess: invalidate,
  })
}
