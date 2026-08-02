export type CategoryStatus = 'visible' | 'hidden'

export type CategoryVO = {
  id: number
  name: string
  description?: string | null
  sortOrder: number
  status: CategoryStatus
  articleCount: number
  createdAt: string
  updatedAt: string
}

export type CategorySaveParams = {
  name: string
  description?: string | null
  sortOrder: number
  status: CategoryStatus
}

export type TagVO = {
  id: number
  name: string
  articleCount: number
  createdAt: string
  updatedAt: string
}

export type TagSaveParams = {
  name: string
}

export type CreateTaxonomyResult = {
  id: number
}
