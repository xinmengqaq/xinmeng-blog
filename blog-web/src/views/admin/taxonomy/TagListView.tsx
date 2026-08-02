import { Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
} from '@/components/ui'
import {
  useCreateTagMutation,
  useDeleteTagMutation,
  useTagsQuery,
  useUpdateTagMutation,
} from '@/queries/taxonomy'
import type { TagSaveParams, TagVO } from '@/types/taxonomy'
import { toApiError } from '@/utils/request'

import { TagListItem } from './TagListItem'
import { TaxonomyDialog } from './TaxonomyDialog'
import './taxonomyPages.css'

export const TagListView = () => {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [editing, setEditing] = useState<TagVO | null | undefined>()
  const [deleting, setDeleting] = useState<TagVO | null>(null)
  const [error, setError] = useState<string | null>(null)
  const query = useTagsQuery(appliedKeyword)
  const createMutation = useCreateTagMutation()
  const updateMutation = useUpdateTagMutation()
  const deleteMutation = useDeleteTagMutation()

  const save = async (params: TagSaveParams) => {
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
        title="文章标签管理"
        description="维护用于文章关联和筛选的标签。"
        actions={
          <Button icon={<Plus />} onClick={() => setEditing(null)}>
            新建标签
          </Button>
        }
      />
      <form
        className="taxonomy-toolbar taxonomy-toolbar--search"
        onSubmit={(event) => {
          event.preventDefault()
          setAppliedKeyword(keyword.trim())
        }}
      >
        <label htmlFor="tag-keyword">标签名称</label>
        <Input
          id="tag-keyword"
          maxLength={50}
          placeholder="搜索标签名称"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Button icon={<Search />} loading={query.isFetching} type="submit">
          查询
        </Button>
        <Button
          icon={<X />}
          variant="secondary"
          onClick={() => {
            setKeyword('')
            setAppliedKeyword('')
          }}
        >
          重置
        </Button>
      </form>
      {error ? <Alert type="error">{error}</Alert> : null}
      {query.isError ? (
        <ErrorState
          description={toApiError(query.error).message}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data ? (
        <LoadingState description="正在加载文章标签。" />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="没有找到标签"
          description="调整关键词，或新建一个文章标签。"
          actionText="新建标签"
          onAction={() => setEditing(null)}
        />
      ) : (
        <div className="taxonomy-list">
          <div className="taxonomy-list-head taxonomy-list-head--tag">
            <span>标签</span>
            <span>关联</span>
            <span>更新</span>
            <span>操作</span>
          </div>
          {query.data.map((tag) => (
            <TagListItem
              key={tag.id}
              tag={tag}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}
      <TaxonomyDialog
        kind="tag"
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
          title="标签正在使用中"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                关闭
              </Button>
              <Button
                onClick={() => navigate(`/admin/articles?tagId=${deleting.id}`)}
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
          title="删除文章标签"
          description={`确认删除“${deleting?.name ?? ''}”吗？此操作无法撤销。`}
          confirmText="删除标签"
          danger
          loading={deleteMutation.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove()}
        />
      )}
    </section>
  )
}
