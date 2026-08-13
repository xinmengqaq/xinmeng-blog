import type {
  AdminMusic,
  AdminMusicPage,
  AdminMusicPageParams,
  CreateAdminMusicParams,
  PublicMusicPage,
  UpdateAdminMusicData,
} from '@/types/music'
import { adminRequest, publicRequest } from '@/utils/request'

export const getAdminMusicPage = (params: AdminMusicPageParams) =>
  adminRequest.get<AdminMusicPage>('/admin/music/tracks', { params })

export const getPublicMusicPage = (
  params: AdminMusicPageParams = { page: 1, page_size: 100 },
) => publicRequest.get<PublicMusicPage>('/music/tracks', { params })

export const getAdminMusic = (id: number) =>
  adminRequest.get<AdminMusic>(`/admin/music/tracks/${id}`)

export const createAdminMusic = ({
  title,
  artist,
  file,
}: CreateAdminMusicParams) => {
  const formData = new FormData()
  formData.append(
    'data',
    JSON.stringify({ title, ...(artist ? { artist } : {}) }),
  )
  formData.append('file', file)
  return adminRequest.post<AdminMusic>('/admin/music/tracks', formData)
}

export const updateAdminMusic = (id: number, data: UpdateAdminMusicData) =>
  adminRequest.patch<AdminMusic>(`/admin/music/tracks/${id}`, { data })

export const deleteAdminMusic = (id: number) =>
  adminRequest.delete<void>(`/admin/music/tracks/${id}`)
