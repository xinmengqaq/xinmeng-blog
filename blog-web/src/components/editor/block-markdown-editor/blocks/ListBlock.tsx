import { memo, type KeyboardEvent, useRef } from 'react'

import { changeListItemIndent, insertListItemAfter } from '../core/commands'
import type { ListBlock as ListBlockType } from '../types'
import { getListKeyboardAction } from '../utils/keyboard'

type ListBlockProps = {
  block: ListBlockType
  readOnly: boolean
  onChange: (block: ListBlockType) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onExitItem: (itemId: string) => void
}

const ListBlockComponent = ({
  block,
  readOnly,
  onChange,
  onKeyDown,
  onExitItem,
}: ListBlockProps) => {
  const Tag = block.type === 'ordered-list' ? 'ol' : 'ul'
  const listRef = useRef<HTMLOListElement & HTMLUListElement>(null)

  const focusItem = (itemId: string) => {
    requestAnimationFrame(() => {
      Array.from(
        listRef.current?.querySelectorAll<HTMLElement>('[data-list-item-id]') ??
          [],
      )
        .find((element) => element.dataset.listItemId === itemId)
        ?.querySelector<HTMLElement>('[data-editor-input]')
        ?.focus()
    })
  }

  return (
    <Tag
      ref={listRef}
      className={`block-editor__list block-editor__list--${block.type}`}
    >
      {block.items.map((item, index) => (
        <li
          key={item.id}
          data-list-item-id={item.id}
          style={{ marginLeft: `${item.indent * 24}px` }}
        >
          {block.type === 'task-list' ? (
            <input
              aria-label={`任务 ${index + 1}`}
              checked={Boolean(item.checked)}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  ...block,
                  items: block.items.map((current) =>
                    current.id === item.id
                      ? { ...current, checked: event.target.checked }
                      : current,
                  ),
                })
              }
              type="checkbox"
            />
          ) : null}
          <span
            className="block-editor__editable"
            contentEditable={!readOnly}
            data-editor-input
            onInput={(event) =>
              onChange({
                ...block,
                items: block.items.map((current) =>
                  current.id === item.id
                    ? { ...current, html: event.currentTarget.innerHTML }
                    : current,
                ),
              })
            }
            onKeyDown={(event) => {
              const action = getListKeyboardAction(event.key, {
                shiftKey: event.shiftKey,
                isEmpty: (event.currentTarget.textContent ?? '').trim() === '',
              })
              if (!action) {
                onKeyDown(event)
                return
              }
              event.preventDefault()
              if (
                action === 'increase-indent' ||
                action === 'decrease-indent'
              ) {
                onChange(
                  changeListItemIndent(
                    block,
                    item.id,
                    action === 'increase-indent' ? 'increase' : 'decrease',
                  ),
                )
                return
              }
              if (action === 'insert-item') {
                const next = insertListItemAfter(block, item.id)
                onChange(next)
                focusItem(next.items[index + 1].id)
                return
              }
              onExitItem(item.id)
            }}
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: item.html }}
          />
        </li>
      ))}
    </Tag>
  )
}

export const ListBlock = memo(
  ListBlockComponent,
  (previous, next) =>
    previous.block === next.block && previous.readOnly === next.readOnly,
)
