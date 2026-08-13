import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createAdminMusic,
  deleteAdminMusic,
  getAdminMusic,
  getAdminMusicPage,
  getPublicMusicPage,
  updateAdminMusic,
} from '@/api/music'
import type {
  AdminMusic,
  AdminMusicPageParams,
  CreateAdminMusicParams,
  UpdateAdminMusicData,
} from '@/types/music'

export const musicQueryKeys = {
  all: ['music'] as const,
  public: () => [...musicQueryKeys.all, 'public'] as const,
  publicPage: (params: AdminMusicPageParams) =>
    [...musicQueryKeys.public(), 'page', { ...params }] as const,
  admin: () => [...musicQueryKeys.all, 'admin'] as const,
  adminPages: () => [...musicQueryKeys.admin(), 'page'] as const,
  adminPage: (params: AdminMusicPageParams) =>
    [...musicQueryKeys.adminPages(), { ...params }] as const,
  adminDetails: () => [...musicQueryKeys.admin(), 'detail'] as const,
  adminDetail: (id: number) => [...musicQueryKeys.adminDetails(), id] as const,
}

export const usePublicMusicQuery = () =>
  useQuery({
    queryKey: musicQueryKeys.publicPage({ page: 1, page_size: 100 }),
    queryFn: () => getPublicMusicPage({ page: 1, page_size: 100 }),
    staleTime: Infinity,
  })

export const useAdminMusicPageQuery = (params: AdminMusicPageParams) =>
  useQuery({
    queryKey: musicQueryKeys.adminPage(params),
    queryFn: () => getAdminMusicPage(params),
  })

export const useAdminMusicQuery = (
  id: number,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: musicQueryKeys.adminDetail(id),
    queryFn: () => getAdminMusic(id),
    enabled: options?.enabled ?? true,
  })

const useInvalidateAdminMusicPages = () => {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: musicQueryKeys.adminPages() })
}

export const useCreateAdminMusicMutation = () => {
  const invalidatePages = useInvalidateAdminMusicPages()
  return useMutation<AdminMusic, unknown, CreateAdminMusicParams>({
    mutationFn: createAdminMusic,
    onSuccess: invalidatePages,
  })
}

export const useUpdateAdminMusicMutation = () => {
  const queryClient = useQueryClient()
  const invalidatePages = useInvalidateAdminMusicPages()
  return useMutation<
    AdminMusic,
    unknown,
    { id: number; data: UpdateAdminMusicData }
  >({
    mutationFn: ({ id, data }) => updateAdminMusic(id, data),
    onSuccess: (music) => {
      queryClient.setQueryData(musicQueryKeys.adminDetail(music.id), music)
      void invalidatePages()
    },
  })
}

export const useDeleteAdminMusicMutation = () => {
  const queryClient = useQueryClient()
  const invalidatePages = useInvalidateAdminMusicPages()
  return useMutation<void, unknown, number>({
    mutationFn: deleteAdminMusic,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: musicQueryKeys.adminDetail(id) })
      void invalidatePages()
    },
  })
}
