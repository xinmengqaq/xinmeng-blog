import { Pencil, Trash2 } from 'lucide-react'

import { Button, Menu } from '@/components/ui'
import type { TagVO } from '@/types/taxonomy'

type TagListItemProps = {
  tag: TagVO
  onEdit: (tag: TagVO) => void
  onDelete: (tag: TagVO) => void
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(
    new Date(value),
  )

export const TagListItem = ({ tag, onEdit, onDelete }: TagListItemProps) => (
  <div className="taxonomy-list-row taxonomy-list-row--tag">
    <strong>{tag.name}</strong>
    <span>{tag.articleCount} 篇文章</span>
    <span>{formatDate(tag.updatedAt)}</span>
    <div className="taxonomy-list-row__actions">
      <Button
        icon={<Pencil />}
        onClick={() => onEdit(tag)}
        size="sm"
        variant="secondary"
      >
        编辑
      </Button>
      <Menu
        label={`${tag.name} 更多操作`}
        items={[
          {
            label: '删除标签',
            icon: <Trash2 />,
            danger: true,
            onSelect: () => onDelete(tag),
          },
        ]}
      />
    </div>
  </div>
)
