import {
  Bold,
  Code2,
  Pilcrow,
  Strikethrough,
  Trash2,
  Underline,
  X,
  Italic,
} from 'lucide-react'

import type { BulkInlineFormat } from '../core/bulkCommands'

type BlockSelectionToolbarProps = {
  count: number
  disabled: boolean
  onClose: () => void
  onDelete: () => void
  onParagraph: () => void
  onFormat: (tag: BulkInlineFormat) => void
}

const formats = [
  { tag: 'strong', label: '批量加粗', icon: Bold },
  { tag: 'em', label: '批量斜体', icon: Italic },
  { tag: 'u', label: '批量下划线', icon: Underline },
  { tag: 'del', label: '批量删除线', icon: Strikethrough },
  { tag: 'code', label: '批量行内代码', icon: Code2 },
] satisfies Array<{
  tag: BulkInlineFormat
  label: string
  icon: typeof Bold
}>

export const BlockSelectionToolbar = ({
  count,
  disabled,
  onClose,
  onDelete,
  onParagraph,
  onFormat,
}: BlockSelectionToolbarProps) => (
  <div
    aria-label="批量块工具"
    className="block-editor__toolbar block-editor__selection-toolbar"
    role="toolbar"
  >
    <span aria-live="polite">已选择 {count} 个块</span>
    <button
      aria-label="批量转换为段落"
      disabled={disabled}
      title="批量转换为段落"
      type="button"
      onClick={onParagraph}
    >
      <Pilcrow aria-hidden="true" />
    </button>
    {formats.map(({ tag, label, icon: Icon }) => (
      <button
        key={tag}
        aria-label={label}
        disabled={disabled}
        title={label}
        type="button"
        onClick={() => onFormat(tag)}
      >
        <Icon aria-hidden="true" />
      </button>
    ))}
    <button
      aria-label="批量删除"
      className="block-editor__toolbar-danger"
      disabled={disabled}
      title="批量删除"
      type="button"
      onClick={onDelete}
    >
      <Trash2 aria-hidden="true" />
    </button>
    <button
      aria-label="取消多选"
      disabled={disabled}
      title="取消多选"
      type="button"
      onClick={onClose}
    >
      <X aria-hidden="true" />
    </button>
  </div>
)
