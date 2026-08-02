import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom'
import {
  ArrowDown,
  ArrowUp,
  Code2,
  Copy,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Table,
  Trash2,
} from 'lucide-react'

import type { BlockType, EditorBlock } from '../types'
import type { BlockInsertChoice } from './BlockInsertMenu'

type BlockToolbarProps = {
  block: EditorBlock
  open: boolean
  disabled: boolean
  disableMoveUp: boolean
  disableMoveDown: boolean
  disableDelete: boolean
  onToggle: () => void
  onClose: () => void
  onConvert: (choice: BlockInsertChoice) => void
  onInsert: (type: BlockType) => void
  onMove: (direction: 'up' | 'down') => void
  onDuplicate: () => void
  onDelete: () => void
}

const typeActions = [
  { label: '切换为段落', type: 'paragraph', icon: Pilcrow },
  { label: '切换为一级标题', type: 'heading', level: 1, icon: Heading1 },
  { label: '切换为二级标题', type: 'heading', level: 2, icon: Heading2 },
  { label: '切换为三级标题', type: 'heading', level: 3, icon: Heading3 },
  { label: '切换为四级标题', type: 'heading', level: 4, icon: Heading4 },
  { label: '切换为引用', type: 'quote', icon: Quote },
  { label: '切换为无序列表', type: 'unordered-list', icon: List },
  { label: '切换为有序列表', type: 'ordered-list', icon: ListOrdered },
  { label: '切换为任务列表', type: 'task-list', icon: ListChecks },
] satisfies Array<{
  label: string
  type: BlockType
  level?: 1 | 2 | 3 | 4
  icon: typeof Pilcrow
}>

const insertActions = [
  { label: '插入代码块', type: 'code', icon: Code2 },
  { label: '上传图片', type: 'image', icon: Image },
  { label: '插入表格', type: 'table', icon: Table },
  { label: '插入分割线', type: 'divider', icon: Minus },
] satisfies Array<{
  label: string
  type: BlockType
  icon: typeof Pilcrow
}>

const isCurrentType = (block: EditorBlock, choice: BlockInsertChoice) =>
  block.type === choice.type &&
  (block.type !== 'heading' || block.level === choice.level)

export const BlockToolbar = ({
  block,
  open,
  disabled,
  disableMoveUp,
  disableMoveDown,
  disableDelete,
  onToggle,
  onClose,
  onConvert,
  onInsert,
  onMove,
  onDuplicate,
  onDelete,
}: BlockToolbarProps) => {
  const { refs, floatingStyles } = useFloating({
    open,
    placement: 'top-start',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const run = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <>
      <button
        ref={refs.setReference}
        aria-expanded={open}
        aria-label="打开块工具"
        className="block-editor__block-handle"
        disabled={disabled}
        title="块工具"
        type="button"
        onClick={onToggle}
      >
        <GripVertical aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={refs.setFloating}
          aria-label="块工具"
          className="block-editor__toolbar block-editor__block-toolbar"
          role="toolbar"
          style={floatingStyles}
        >
          <div className="block-editor__toolbar-group">
            {typeActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={`${action.type}-${action.level ?? ''}`}
                  aria-label={action.label}
                  aria-pressed={isCurrentType(block, action)}
                  disabled={disabled}
                  title={action.label}
                  type="button"
                  onClick={() => run(() => onConvert(action))}
                >
                  <Icon aria-hidden="true" />
                </button>
              )
            })}
          </div>
          <div className="block-editor__toolbar-group">
            {insertActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.type}
                  aria-label={action.label}
                  disabled={disabled}
                  title={action.label}
                  type="button"
                  onClick={() => run(() => onInsert(action.type))}
                >
                  <Icon aria-hidden="true" />
                </button>
              )
            })}
          </div>
          <div className="block-editor__toolbar-group">
            <button
              aria-label="上移块"
              disabled={disabled || disableMoveUp}
              title="上移块"
              type="button"
              onClick={() => run(() => onMove('up'))}
            >
              <ArrowUp aria-hidden="true" />
            </button>
            <button
              aria-label="下移块"
              disabled={disabled || disableMoveDown}
              title="下移块"
              type="button"
              onClick={() => run(() => onMove('down'))}
            >
              <ArrowDown aria-hidden="true" />
            </button>
            <button
              aria-label="复制块"
              disabled={disabled}
              title="复制块"
              type="button"
              onClick={() => run(onDuplicate)}
            >
              <Copy aria-hidden="true" />
            </button>
            <button
              aria-label="删除块"
              className="block-editor__toolbar-danger"
              disabled={disabled || disableDelete}
              title="删除块"
              type="button"
              onClick={() => run(onDelete)}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
