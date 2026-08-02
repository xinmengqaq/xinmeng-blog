import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Columns3,
  Eraser,
  Merge,
  Rows3,
  Split,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
} from 'lucide-react'

import type { TextAlign } from '../types'

type TableToolbarProps = {
  hasHeader: boolean
  canMerge: boolean
  canSplit: boolean
  alignment: TextAlign
  onAction: (
    action:
      | 'insert-row-before'
      | 'insert-row-after'
      | 'insert-column-before'
      | 'insert-column-after'
      | 'delete-row'
      | 'delete-column'
      | 'merge'
      | 'split'
      | 'clear'
      | 'delete-table',
  ) => void
  onAlignment: (alignment: TextAlign) => void
  onToggleHeader: () => void
}

const ActionButton = ({
  label,
  disabled,
  danger,
  icon: Icon,
  onClick,
}: {
  label: string
  disabled?: boolean
  danger?: boolean
  icon: typeof Rows3
  onClick: () => void
}) => (
  <button
    aria-label={label}
    className={danger ? 'block-editor__table-menu-danger' : undefined}
    disabled={disabled}
    role="menuitem"
    title={label}
    type="button"
    onClick={onClick}
  >
    <Icon aria-hidden="true" />
    <span>{label}</span>
  </button>
)

export const TableToolbar = ({
  hasHeader,
  canMerge,
  canSplit,
  alignment,
  onAction,
  onAlignment,
  onToggleHeader,
}: TableToolbarProps) => (
  <div aria-label="表格工具" className="block-editor__table-menu" role="menu">
    <div className="block-editor__table-menu-section">
      <ActionButton
        icon={TableRowsSplit}
        label="插入上方行"
        onClick={() => onAction('insert-row-before')}
      />
      <ActionButton
        icon={Rows3}
        label="插入下方行"
        onClick={() => onAction('insert-row-after')}
      />
      <ActionButton
        icon={TableColumnsSplit}
        label="插入左侧列"
        onClick={() => onAction('insert-column-before')}
      />
      <ActionButton
        icon={Columns3}
        label="插入右侧列"
        onClick={() => onAction('insert-column-after')}
      />
      <ActionButton
        icon={TableRowsSplit}
        label="删除当前行"
        onClick={() => onAction('delete-row')}
      />
      <ActionButton
        icon={TableColumnsSplit}
        label="删除当前列"
        onClick={() => onAction('delete-column')}
      />
    </div>
    <div className="block-editor__table-menu-section">
      <ActionButton
        disabled={!canMerge}
        icon={Merge}
        label="合并单元格"
        onClick={() => onAction('merge')}
      />
      <ActionButton
        disabled={!canSplit}
        icon={Split}
        label="拆分单元格"
        onClick={() => onAction('split')}
      />
      <button
        aria-checked={hasHeader}
        role="menuitemcheckbox"
        type="button"
        onClick={onToggleHeader}
      >
        <Rows3 aria-hidden="true" />
        <span>表头</span>
      </button>
    </div>
    <div className="block-editor__table-menu-section block-editor__table-menu-align">
      {(
        [
          ['left', '左对齐', AlignLeft],
          ['center', '居中对齐', AlignCenter],
          ['right', '右对齐', AlignRight],
        ] as const
      ).map(([value, label, Icon]) => (
        <button
          key={value}
          aria-checked={alignment === value}
          aria-label={label}
          role="menuitemradio"
          title={label}
          type="button"
          onClick={() => onAlignment(value)}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
    <div className="block-editor__table-menu-section">
      <ActionButton
        icon={Eraser}
        label="清空单元格"
        onClick={() => onAction('clear')}
      />
      <ActionButton
        danger
        icon={Trash2}
        label="删除表格"
        onClick={() => onAction('delete-table')}
      />
    </div>
  </div>
)
