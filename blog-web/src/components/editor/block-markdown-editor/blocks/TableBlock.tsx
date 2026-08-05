import {
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Plus } from 'lucide-react'

import {
  clearTableCells,
  deleteTableColumn,
  deleteTableRow,
  getRectangularTableSelection,
  getTableCellAreas,
  getTableDimensions,
  insertTableColumn,
  insertTableRow,
  mergeTableCells,
  setTableCellsAlignment,
  setTableColumnWidth,
  splitTableCell,
} from '../core/commands'
import { TableToolbar } from '../toolbars/TableToolbar'
import type { TableBlock as TableBlockType, TextAlign } from '../types'

type TableBlockProps = {
  block: TableBlockType
  readOnly: boolean
  onChange: (block: TableBlockType) => void
  onDelete: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

type ColumnDrag = {
  column: number
  startX: number
  startWidth: number
}

const TableBlockComponent = ({
  block,
  readOnly,
  onChange,
  onDelete,
  onKeyDown,
}: TableBlockProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [anchorId, setAnchorId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [columnDrag, setColumnDrag] = useState<ColumnDrag | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const areas = useMemo(() => getTableCellAreas(block), [block])
  const dimensions = useMemo(() => getTableDimensions(block), [block])
  const activeArea = areas.find((area) => area.cell.id === activeId) ?? areas[0]
  const activeCell = activeArea?.cell

  useEffect(() => {
    if (!columnDrag) return
    const onMouseMove = (event: globalThis.MouseEvent) => {
      onChange(
        setTableColumnWidth(
          block,
          columnDrag.column,
          columnDrag.startWidth + event.clientX - columnDrag.startX,
        ),
      )
    }
    const onMouseUp = () => setColumnDrag(null)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [block, columnDrag, onChange])

  useEffect(() => {
    if (!menuOpen) return

    const closeMenuOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.block-editor__table-menu')) return
      setMenuOpen(false)
    }
    const closeMenuOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setMenuOpen(false)
    }
    document.addEventListener(
      'pointerdown',
      closeMenuOnOutsidePointerDown,
      true,
    )
    document.addEventListener('keydown', closeMenuOnEscape, true)
    return () => {
      document.removeEventListener(
        'pointerdown',
        closeMenuOnOutsidePointerDown,
        true,
      )
      document.removeEventListener('keydown', closeMenuOnEscape, true)
    }
  }, [menuOpen])

  const selectCell = (cellId: string, extend: boolean, openMenu = false) => {
    const next =
      extend && anchorId
        ? getRectangularTableSelection(block, anchorId, cellId)
        : [cellId]
    setSelectedIds(next)
    setAnchorId((current) => (extend && current ? current : cellId))
    setActiveId(cellId)
    setMenuOpen(openMenu)
  }

  const closeMenu = () => setMenuOpen(false)

  const updateAndClose = (next: TableBlockType) => {
    onChange(next)
    closeMenu()
  }

  const runAction = (
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
  ) => {
    if (!activeArea) return
    switch (action) {
      case 'insert-row-before':
        updateAndClose(insertTableRow(block, activeArea.row, 'before'))
        break
      case 'insert-row-after':
        updateAndClose(insertTableRow(block, activeArea.row, 'after'))
        break
      case 'insert-column-before':
        updateAndClose(insertTableColumn(block, activeArea.column, 'before'))
        break
      case 'insert-column-after':
        updateAndClose(insertTableColumn(block, activeArea.column, 'after'))
        break
      case 'delete-row':
        updateAndClose(deleteTableRow(block, activeArea.row))
        break
      case 'delete-column':
        updateAndClose(deleteTableColumn(block, activeArea.column))
        break
      case 'merge': {
        const next = mergeTableCells(block, selectedIds)
        const firstId = selectedIds[0]
        setSelectedIds(firstId ? [firstId] : [])
        setActiveId(firstId ?? null)
        updateAndClose(next)
        break
      }
      case 'split':
        updateAndClose(splitTableCell(block, activeArea.cell.id))
        break
      case 'clear':
        updateAndClose(clearTableCells(block, selectedIds))
        break
      case 'delete-table':
        closeMenu()
        onDelete()
        break
    }
  }

  const handleCellKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing) {
      onKeyDown(event)
      return
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === 'Enter' &&
      activeArea
    ) {
      event.preventDefault()
      onChange(
        insertTableRow(
          block,
          activeArea.row,
          event.shiftKey ? 'before' : 'after',
        ),
      )
      return
    }
    if (event.key === 'Tab') {
      const inputs = Array.from(
        wrapRef.current?.querySelectorAll<HTMLElement>(
          '[data-table-cell-input]',
        ) ?? [],
      )
      const index = inputs.indexOf(event.currentTarget)
      const nextIndex = event.shiftKey ? index - 1 : index + 1
      if (inputs[nextIndex]) {
        event.preventDefault()
        inputs[nextIndex].focus()
      }
    }
    onKeyDown(event)
  }

  const handleContextMenu = (event: ReactMouseEvent, cellId: string) => {
    event.preventDefault()
    if (selectedIds.includes(cellId)) {
      setActiveId(cellId)
      setMenuOpen(true)
      return
    }
    selectCell(cellId, event.shiftKey, true)
  }

  const setAlignment = (alignment: TextAlign) => {
    onChange(setTableCellsAlignment(block, selectedIds, alignment))
    closeMenu()
  }

  return (
    <div ref={wrapRef} className="block-editor__table-wrap">
      <div className="block-editor__table-scroll">
        <table className="block-editor__table">
          {block.columnWidths.some(Boolean) ? (
            <colgroup>
              {Array.from({ length: dimensions.columns }, (_, index) => {
                const width = block.columnWidths[index]
                return <col key={index} style={width ? { width } : undefined} />
              })}
            </colgroup>
          ) : null}
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell) => {
                  const Cell = block.hasHeader && rowIndex === 0 ? 'th' : 'td'
                  return (
                    <Cell
                      key={cell.id}
                      className={
                        selectedIds.includes(cell.id)
                          ? 'is-selected'
                          : undefined
                      }
                      colSpan={cell.colspan}
                      rowSpan={cell.rowspan}
                      style={{ textAlign: cell.align }}
                      onClick={(event) =>
                        !readOnly && selectCell(cell.id, event.shiftKey)
                      }
                      onContextMenu={(event) =>
                        !readOnly && handleContextMenu(event, cell.id)
                      }
                    >
                      <span
                        className="block-editor__editable"
                        contentEditable={!readOnly}
                        data-editor-input
                        data-table-cell-input
                        onInput={(event) =>
                          onChange({
                            ...block,
                            rows: block.rows.map((currentRow) =>
                              currentRow.map((currentCell) =>
                                currentCell.id === cell.id
                                  ? {
                                      ...currentCell,
                                      html: event.currentTarget.innerHTML,
                                    }
                                  : currentCell,
                              ),
                            ),
                          })
                        }
                        onKeyDown={handleCellKeyDown}
                        suppressContentEditableWarning
                        dangerouslySetInnerHTML={{ __html: cell.html }}
                      />
                    </Cell>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <>
          <div className="block-editor__table-row-controls" aria-hidden="false">
            {Array.from({ length: dimensions.rows + 1 }, (_, index) => (
              <button
                key={index}
                aria-label={
                  index === 0 ? '在第 1 行上方插入' : `在第 ${index} 行下方插入`
                }
                className="block-editor__table-edge-button"
                style={{ top: `${(index / dimensions.rows) * 100}%` }}
                title="插入行"
                type="button"
                onClick={() =>
                  onChange(
                    insertTableRow(
                      block,
                      Math.max(0, index - 1),
                      index === 0 ? 'before' : 'after',
                    ),
                  )
                }
              >
                <Plus aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="block-editor__table-column-controls">
            {Array.from({ length: dimensions.columns }, (_, index) => (
              <button
                key={index}
                aria-label={`在第 ${index + 1} 列右侧插入`}
                className="block-editor__table-edge-button"
                style={{ left: `${((index + 1) / dimensions.columns) * 100}%` }}
                title="插入列"
                type="button"
                onClick={() =>
                  onChange(insertTableColumn(block, index, 'after'))
                }
              >
                <Plus aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="block-editor__table-resize-controls">
            {Array.from({ length: dimensions.columns }, (_, index) => (
              <div
                key={index}
                aria-label={`调整第 ${index + 1} 列宽度`}
                aria-orientation="vertical"
                className="block-editor__table-resize-handle"
                role="separator"
                style={{ left: `${((index + 1) / dimensions.columns) * 100}%` }}
                tabIndex={0}
                onMouseDown={(event) => {
                  event.preventDefault()
                  setColumnDrag({
                    column: index,
                    startX: event.clientX,
                    startWidth:
                      Number.parseInt(block.columnWidths[index] ?? '', 10) ||
                      160,
                  })
                }}
              />
            ))}
          </div>
          {menuOpen && activeCell ? (
            <TableToolbar
              alignment={activeCell.align}
              canMerge={selectedIds.length > 1}
              canSplit={activeCell.rowspan > 1 || activeCell.colspan > 1}
              hasHeader={block.hasHeader}
              onAction={runAction}
              onAlignment={setAlignment}
              onToggleHeader={() => {
                onChange({ ...block, hasHeader: !block.hasHeader })
                closeMenu()
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export const TableBlock = memo(
  TableBlockComponent,
  (previous, next) =>
    previous.block === next.block && previous.readOnly === next.readOnly,
)
