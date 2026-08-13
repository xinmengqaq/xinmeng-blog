import type {
  CategorySaveParams,
  CategoryStatus,
  CategoryVO,
  CreateTaxonomyResult,
  TagSaveParams,
  TagVO,
} from '@/types/taxonomy'
import { adminRequest } from '@/utils/request'

export const getCategories = (status: CategoryStatus | '' = '') =>
  adminRequest.get<CategoryVO[]>('/admin/categories', {
    params: status ? { status } : {},
  })

export const createCategory = (params: CategorySaveParams) =>
  adminRequest.post<CreateTaxonomyResult>('/admin/categories', params)

export const updateCategory = (id: number, params: CategorySaveParams) =>
  adminRequest.put<CategoryVO>(`/admin/categories/${id}`, params)

export const deleteCategory = (id: number) =>
  adminRequest.delete<void>(`/admin/categories/${id}`)

export const getTags = (keyword = '') =>
  adminRequest.get<TagVO[]>('/admin/tags', {
    params: keyword ? { keyword } : {},
  })

export const createTag = (params: TagSaveParams) =>
  adminRequest.post<CreateTaxonomyResult>('/admin/tags', params)

export const updateTag = (id: number, params: TagSaveParams) =>
  adminRequest.put<TagVO>(`/admin/tags/${id}`, params)

export const deleteTag = (id: number) =>
  adminRequest.delete<void>(`/admin/tags/${id}`)
