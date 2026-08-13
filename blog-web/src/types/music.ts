export type AdminMusic = {
  id: number
  title: string
  artist: string | null
  audio_url: string
  duration_ms: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export type PublicMusic = Pick<
  AdminMusic,
  'id' | 'title' | 'artist' | 'audio_url' | 'duration_ms'
>

export type PublicMusicPage = {
  items: PublicMusic[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export type AdminMusicPage = {
  items: AdminMusic[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export type AdminMusicPageParams = {
  page: number
  page_size: number
}

export type CreateAdminMusicParams = {
  title: string
  artist?: string
  file: File
}

export type UpdateAdminMusicData = {
  title?: string
  artist?: string | null
  is_enabled?: boolean
}
