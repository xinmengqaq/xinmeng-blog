import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'

import { Button, Menu } from '@/components/ui'
import type { CategoryVO } from '@/types/taxonomy'

type CategoryListItemProps = {
  category: CategoryVO
  onEdit: (category: CategoryVO) => void
  onDelete: (category: CategoryVO) => void
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(
    new Date(value),
  )

export const CategoryListItem = ({
  category,
  onEdit,
  onDelete,
}: CategoryListItemProps) => (
  <div className="taxonomy-list-row taxonomy-list-row--category">
    <div className="taxonomy-list-row__name">
      <strong>{category.name}</strong>
      <span>{category.description?.trim() || '暂无描述'}</span>
    </div>
    <span className="taxonomy-status">
      {category.status === 'visible' ? <Eye /> : <EyeOff />}
      {category.status === 'visible' ? '显示' : '隐藏'}
    </span>
    <span>{category.articleCount} 篇文章</span>
    <span>{category.sortOrder}</span>
    <span>{formatDate(category.updatedAt)}</span>
    <div className="taxonomy-list-row__actions">
      <Button
        icon={<Pencil />}
        onClick={() => onEdit(category)}
        size="sm"
        variant="secondary"
      >
        编辑
      </Button>
      <Menu
        label={`${category.name} 更多操作`}
        items={[
          {
            label: '删除分类',
            icon: <Trash2 />,
            danger: true,
            onSelect: () => onDelete(category),
          },
        ]}
      />
    </div>
  </div>
)
