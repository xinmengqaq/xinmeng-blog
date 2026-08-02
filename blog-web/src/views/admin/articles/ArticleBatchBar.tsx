import { CheckSquare, LogOut, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button, ConfirmDialog } from '@/components/ui'
import { useBatchDeleteArticlesMutation } from '@/queries/article'
import { toApiError } from '@/utils/request'

type ArticleBatchBarProps = {
  selectedIds: number[]
  allSelected: boolean
  onToggleAll: () => void
  onExit: () => void
  onDeleted: (deletedCount: number) => void
  onError: (message: string) => void
}

export const ArticleBatchBar = ({
  selectedIds,
  allSelected,
  onToggleAll,
  onExit,
  onDeleted,
  onError,
}: ArticleBatchBarProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const mutation = useBatchDeleteArticlesMutation()

  const remove = async () => {
    try {
      const result = await mutation.mutateAsync(selectedIds)
      setConfirmOpen(false)
      onDeleted(result.deletedCount)
    } catch (error) {
      onError(toApiError(error).message)
    }
  }

  return (
    <>
      <div className="article-batch-bar">
        <div>
          <strong>已选择 {selectedIds.length} 篇文章</strong>
          <span>选择仅在当前页有效</span>
        </div>
        <div className="article-batch-bar__actions">
          <Button
            icon={<CheckSquare />}
            onClick={onToggleAll}
            variant="secondary"
          >
            {allSelected ? '取消全选' : '当前页全选'}
          </Button>
          <Button
            disabled={selectedIds.length === 0}
            icon={<Trash2 />}
            onClick={() => setConfirmOpen(true)}
            variant="danger"
          >
            批量删除
          </Button>
          <Button icon={<LogOut />} onClick={onExit} variant="ghost">
            退出批量管理
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="批量删除文章"
        description={`确认删除已选择的 ${selectedIds.length} 篇文章吗？此操作无法撤销。`}
        confirmText="批量删除"
        danger
        loading={mutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void remove()}
      />
    </>
  )
}
