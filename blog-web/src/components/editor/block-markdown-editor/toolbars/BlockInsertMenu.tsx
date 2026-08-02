import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Table,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { BlockType } from '../types'

export type BlockInsertChoice = {
  type: BlockType
  level?: 1 | 2 | 3 | 4
}

type BlockInsertMenuProps = {
  disabled: boolean
  onSelect: (choice: BlockInsertChoice) => void
  onClose: () => void
}

const menuItems = [
  { label: '段落', type: 'paragraph', icon: Pilcrow },
  { label: '一级标题', type: 'heading', level: 1, icon: Heading1 },
  { label: '二级标题', type: 'heading', level: 2, icon: Heading2 },
  { label: '三级标题', type: 'heading', level: 3, icon: Heading3 },
  { label: '引用', type: 'quote', icon: Quote },
  { label: '无序列表', type: 'unordered-list', icon: List },
  { label: '有序列表', type: 'ordered-list', icon: ListOrdered },
  { label: '任务列表', type: 'task-list', icon: ListChecks },
  { label: '代码块', type: 'code', icon: Code2 },
  { label: '上传图片', type: 'image', icon: Image },
  { label: '表格', type: 'table', icon: Table },
  { label: '分割线', type: 'divider', icon: Minus },
] satisfies Array<{
  label: string
  type: BlockType
  level?: 1 | 2 | 3
  icon: typeof Pilcrow
}>

export const BlockInsertMenu = ({
  disabled,
  onSelect,
  onClose,
}: BlockInsertMenuProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [])

  return (
    <div
      ref={menuRef}
      className="block-editor__insert-menu"
      role="menu"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          const direction = event.key === 'ArrowDown' ? 1 : -1
          const next =
            (activeIndex + direction + menuItems.length) % menuItems.length
          setActiveIndex(next)
          const buttons =
            menuRef.current?.querySelectorAll<HTMLButtonElement>('button')
          buttons?.[next]?.focus()
        }
      }}
    >
      {menuItems.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            key={`${item.type}-${item.level ?? ''}`}
            className={index === activeIndex ? 'is-active' : undefined}
            disabled={disabled}
            onFocus={() => setActiveIndex(index)}
            onClick={() => onSelect({ type: item.type, level: item.level })}
            role="menuitem"
            type="button"
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
