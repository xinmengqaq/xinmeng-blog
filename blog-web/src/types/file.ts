export interface ImageDraft {
  id: string
  originalFile: File
  uploadBlob: Blob
  previewUrl: string
  type: 'static' | 'gif'
  alt?: string
}

export type AdminAvatarChange =
  { kind: 'upload'; draft: ImageDraft } | { kind: 'remove' }

export type UserAvatarChange = AdminAvatarChange

export type ArticleCoverChange =
  { kind: 'upload'; draft: ImageDraft } | { kind: 'remove' }

export type SiteBackgroundChange =
  { kind: 'upload'; draft: ImageDraft } | { kind: 'remove' }
