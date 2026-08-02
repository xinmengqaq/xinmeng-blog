import type {
  CategorySaveParams,
  CategoryStatus,
  CategoryVO,
  CreateTaxonomyResult,
  TagSaveParams,
  TagVO,
} from '@/types/taxonomy'
import { request } from '@/utils/request'

export const getCategories = (status: CategoryStatus | '' = '') =>
  request.get<CategoryVO[]>('/admin/categories', {
    params: status ? { status } : {},
  })

export const createCategory = (params: CategorySaveParams) =>
  request.post<CreateTaxonomyResult>('/admin/categories', params)

export const updateCategory = (id: number, params: CategorySaveParams) =>
  request.put<CategoryVO>(`/admin/categories/${id}`, params)

export const deleteCategory = (id: number) =>
  request.delete<void>(`/admin/categories/${id}`)

export const getTags = (keyword = '') =>
  request.get<TagVO[]>('/admin/tags', {
    params: keyword ? { keyword } : {},
  })

export const createTag = (params: TagSaveParams) =>
  request.post<CreateTaxonomyResult>('/admin/tags', params)

export const updateTag = (id: number, params: TagSaveParams) =>
  request.put<TagVO>(`/admin/tags/${id}`, params)

export const deleteTag = (id: number) =>
  request.delete<void>(`/admin/tags/${id}`)
