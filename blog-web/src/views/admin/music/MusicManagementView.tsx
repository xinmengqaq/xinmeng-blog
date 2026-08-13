import { Upload } from 'lucide-react'
import { useState } from 'react'

import { MusicFormDialog } from '@/components/admin/music/MusicFormDialog'
import { MusicList } from '@/components/admin/music/MusicList'
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '@/components/ui'
import {
  useAdminMusicPageQuery,
  useCreateAdminMusicMutation,
  useDeleteAdminMusicMutation,
  useUpdateAdminMusicMutation,
} from '@/queries/music'
import type {
  AdminMusic,
  CreateAdminMusicParams,
  UpdateAdminMusicData,
} from '@/types/music'
import { toApiError } from '@/utils/request'

const PAGE_SIZE = 20

export const MusicManagementView = () => {
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminMusic | null | undefined>()
  const [deleting, setDeleting] = useState<AdminMusic | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const query = useAdminMusicPageQuery({ page, page_size: PAGE_SIZE })
  const createMutation = useCreateAdminMusicMutation()
  const updateMutation = useUpdateAdminMusicMutation()
  const deleteMutation = useDeleteAdminMusicMutation()

  const createMusic = async (params: CreateAdminMusicParams) => {
    try {
      await createMutation.mutateAsync(params)
      setEditing(undefined)
      setFormError(null)
    } catch (error) {
      setFormError(toApiError(error).message)
    }
  }

  const updateMusic = async (id: number, data: UpdateAdminMusicData) => {
    try {
      await updateMutation.mutateAsync({ id, data })
      setEditing(undefined)
      setFormError(null)
    } catch (error) {
      setFormError(toApiError(error).message)
    }
  }

  const toggleMusic = async (music: AdminMusic, enabled: boolean) => {
    setUpdatingId(music.id)
    setOperationError(null)
    try {
      await updateMutation.mutateAsync({
        id: music.id,
        data: { is_enabled: enabled },
      })
    } catch (error) {
      setOperationError(toApiError(error).message)
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteMusic = async () => {
    if (!deleting) return
    try {
      await deleteMutation.mutateAsync(deleting.id)
      if (query.data?.items.length === 1 && page > 1) setPage(page - 1)
      setDeleting(null)
      setOperationError(null)
    } catch (error) {
      setOperationError(toApiError(error).message)
    }
  }

  const openCreate = () => {
    setFormError(null)
    setEditing(null)
  }

  return (
    <section className="admin-page music-management-page">
      <PageHeader
        title="音乐管理"
        actions={
          <Button icon={<Upload />} onClick={openCreate}>
            上传音乐
          </Button>
        }
      />

      {operationError ? <Alert type="error">{operationError}</Alert> : null}

      {query.isError ? (
        <ErrorState
          description={toApiError(query.error).message}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data ? (
        <LoadingState description="正在加载音乐列表。" />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          actionText="上传音乐"
          description="上传第一首音乐后，可在这里管理和试听。"
          title="还没有音乐"
          onAction={openCreate}
        />
      ) : (
        <MusicList
          items={query.data.items}
          page={query.data.page}
          total={query.data.total}
          totalPages={query.data.total_pages}
          updatingId={updatingId}
          onDelete={(music) => {
            setOperationError(null)
            setDeleting(music)
          }}
          onEdit={(music) => {
            setFormError(null)
            setEditing(music)
          }}
          onPageChange={setPage}
          onPreviewError={setOperationError}
          onToggle={(music, enabled) => void toggleMusic(music, enabled)}
        />
      )}

      {editing !== undefined ? (
        <MusicFormDialog
          loading={createMutation.isPending || updateMutation.isPending}
          music={editing}
          open
          requestError={formError}
          onClose={() => setEditing(undefined)}
          onCreate={createMusic}
          onUpdate={updateMusic}
        />
      ) : null}

      <ConfirmDialog
        confirmText="删除音乐"
        danger
        description={`确认删除“${deleting?.title ?? ''}”吗？音乐文件也会被删除，此操作无法撤销。`}
        loading={deleteMutation.isPending}
        open={Boolean(deleting)}
        title="删除音乐"
        onCancel={() => setDeleting(null)}
        onConfirm={() => void deleteMusic()}
      />
    </section>
  )
}
