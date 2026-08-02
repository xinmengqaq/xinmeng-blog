import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
} from '@/components/ui'
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} from '@/queries/taxonomy'
import type {
  CategorySaveParams,
  CategoryStatus,
  CategoryVO,
} from '@/types/taxonomy'
import { toApiError } from '@/utils/request'

import { CategoryListItem } from './CategoryListItem'
import { TaxonomyDialog } from './TaxonomyDialog'
import './taxonomyPages.css'

export const CategoryListView = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<CategoryStatus | ''>('')
  const [editing, setEditing] = useState<CategoryVO | null | undefined>()
  const [deleting, setDeleting] = useState<CategoryVO | null>(null)
  const [error, setError] = useState<string | null>(null)
  const query = useCategoriesQuery(status)
  const createMutation = useCreateCategoryMutation()
  const updateMutation = useUpdateCategoryMutation()
  const deleteMutation = useDeleteCategoryMutation()

  const save = async (params: CategorySaveParams) => {
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, params })
      else await createMutation.mutateAsync(params)
      setEditing(undefined)
      setError(null)
    } catch (nextError) {
      setError(toApiError(nextError).message)
    }
  }

  const remove = async () => {
    if (!deleting || deleting.articleCount > 0) return
    try {
      await deleteMutation.mutateAsync(deleting.id)
      setDeleting(null)
      setError(null)
    } catch (nextError) {
      setError(toApiError(nextError).message)
    }
  }

  return (
    <section className="admin-page taxonomy-page">
      <PageHeader
        title="文章分类管理"
        description="维护文章分类、显示状态和固定排序值。"
        actions={
          <Button icon={<Plus />} onClick={() => setEditing(null)}>
            新建分类
          </Button>
        }
      />
      <div className="taxonomy-toolbar">
        <label htmlFor="category-status-filter">显示状态</label>
        <select
          className="taxonomy-select"
          id="category-status-filter"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as CategoryStatus | '')
          }
        >
          <option value="">全部状态</option>
          <option value="visible">显示</option>
          <option value="hidden">隐藏</option>
        </select>
      </div>
      {error ? <Alert type="error">{error}</Alert> : null}
      {query.isError ? (
        <ErrorState
          description={toApiError(query.error).message}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data ? (
        <LoadingState description="正在加载文章分类。" />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="没有符合条件的分类"
          description="调整状态筛选，或新建一个文章分类。"
          actionText="新建分类"
          onAction={() => setEditing(null)}
        />
      ) : (
        <div className="taxonomy-list">
          <div className="taxonomy-list-head taxonomy-list-head--category">
            <span>分类</span>
            <span>状态</span>
            <span>关联</span>
            <span>排序</span>
            <span>更新</span>
            <span>操作</span>
          </div>
          {query.data.map((category) => (
            <CategoryListItem
              key={category.id}
              category={category}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}
      <TaxonomyDialog
        kind="category"
        open={editing !== undefined}
        item={editing}
        loading={createMutation.isPending || updateMutation.isPending}
        requestError={error}
        onClose={() => setEditing(undefined)}
        onSubmit={save}
      />
      {deleting?.articleCount ? (
        <Modal
          open
          title="分类正在使用中"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                关闭
              </Button>
              <Button
                onClick={() =>
                  navigate(`/admin/articles?categoryId=${deleting.id}`)
                }
              >
                查看关联文章
              </Button>
            </>
          }
        >
          “{deleting.name}”当前关联 {deleting.articleCount}{' '}
          篇文章，解除关联后才能删除。
        </Modal>
      ) : (
        <ConfirmDialog
          open={Boolean(deleting)}
          title="删除文章分类"
          description={`确认删除“${deleting?.name ?? ''}”吗？此操作无法撤销。`}
          confirmText="删除分类"
          danger
          loading={deleteMutation.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove()}
        />
      )}
    </section>
  )
}
