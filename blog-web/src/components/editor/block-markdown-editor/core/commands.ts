import type {
  BlockType,
  EditorBlock,
  ListBlock,
  TableBlock,
  TableCell,
  TextAlign,
} from '../types'
import {
  cloneBlockWithNewIds,
  createBlockId,
  createDefaultTableBlock,
  createHeadingBlock,
  createListItem,
  createParagraphBlock,
  createTableCell,
  ensureNonEmptyDocument,
  getPlainTextFromHtml,
} from './blockModel'

export const insertBlockAfter = (
  blocks: EditorBlock[],
  targetId: string,
  block: EditorBlock,
) => {
  const index = blocks.findIndex((item) => item.id === targetId)
  if (index < 0) {
    return blocks
  }

  return [...blocks.slice(0, index + 1), block, ...blocks.slice(index + 1)]
}

export const updateBlock = (
  blocks: EditorBlock[],
  blockId: string,
  patch: Partial<EditorBlock>,
) =>
  blocks.map((block) =>
    block.id === blockId ? ({ ...block, ...patch } as EditorBlock) : block,
  )

export const removeBlock = (blocks: EditorBlock[], blockId: string) =>
  ensureNonEmptyDocument(blocks.filter((block) => block.id !== blockId))

export const moveBlock = (
  blocks: EditorBlock[],
  blockId: string,
  direction: 'up' | 'down',
) => {
  const index = blocks.findIndex((block) => block.id === blockId)
  const nextIndex = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) {
    return blocks
  }

  const next = [...blocks]
  ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
  return next
}

export const duplicateBlock = (blocks: EditorBlock[], blockId: string) => {
  const block = blocks.find((item) => item.id === blockId)
  return block
    ? insertBlockAfter(blocks, blockId, cloneBlockWithNewIds(block))
    : blocks
}

const blockText = (block: EditorBlock) => {
  if (
    block.type === 'paragraph' ||
    block.type === 'quote' ||
    block.type === 'heading'
  ) {
    return block.html
  }
  if (block.type === 'code') {
    return block.code
  }
  if (
    block.type === 'unordered-list' ||
    block.type === 'ordered-list' ||
    block.type === 'task-list'
  ) {
    return block.items.map((item) => item.html).join('<br>')
  }
  if (block.type === 'image') {
    return block.alt ?? block.url
  }
  return ''
}

export const createBlockByType = (type: BlockType): EditorBlock => {
  switch (type) {
    case 'paragraph':
      return createParagraphBlock()
    case 'heading':
      return createHeadingBlock(1)
    case 'quote':
      return { ...createParagraphBlock(), type: 'quote' }
    case 'unordered-list':
    case 'ordered-list':
    case 'task-list':
      return {
        id: createBlockId(),
        type,
        items: [
          createListItem('', {
            indent: 0,
            checked: type === 'task-list' ? false : undefined,
          }),
        ],
      }
    case 'code':
      return { id: createBlockId(), type: 'code', code: '' }
    case 'image':
      return { id: createBlockId(), type: 'image', url: '', alt: '' }
    case 'table':
      return createDefaultTableBlock()
    case 'divider':
      return { id: createBlockId(), type: 'divider' }
  }
}

export const convertBlockType = (
  blocks: EditorBlock[],
  blockId: string,
  nextType: BlockType,
) =>
  blocks.map((block) => {
    if (block.id !== blockId || block.type === nextType) {
      return block
    }

    const html = blockText(block)
    const converted = createBlockByType(nextType)
    if (converted.type === 'paragraph' || converted.type === 'quote') {
      return { ...converted, id: block.id, html }
    }
    if (converted.type === 'heading') {
      return { ...converted, id: block.id, html }
    }
    if (
      converted.type === 'unordered-list' ||
      converted.type === 'ordered-list' ||
      converted.type === 'task-list'
    ) {
      return {
        ...converted,
        id: block.id,
        items: [
          createListItem(html, {
            indent: 0,
            checked: converted.type === 'task-list' ? false : undefined,
          }),
        ],
      }
    }
    if (converted.type === 'code') {
      return { ...converted, id: block.id, code: getPlainTextFromHtml(html) }
    }
    return { ...converted, id: block.id }
  })

export const changeListItemIndent = (
  block: ListBlock,
  itemId: string,
  direction: 'increase' | 'decrease',
): ListBlock => ({
  ...block,
  items: block.items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          indent: Math.max(
            0,
            Math.min(2, item.indent + (direction === 'increase' ? 1 : -1)),
          ) as 0 | 1 | 2,
        }
      : item,
  ),
})

export const insertListItemAfter = (
  block: ListBlock,
  itemId: string,
): ListBlock => {
  const index = block.items.findIndex((item) => item.id === itemId)
  if (index < 0) return block
  const current = block.items[index]
  const item = createListItem('', {
    indent: current.indent,
    checked: block.type === 'task-list' ? false : undefined,
  })
  return {
    ...block,
    items: [
      ...block.items.slice(0, index + 1),
      item,
      ...block.items.slice(index + 1),
    ],
  }
}

export const exitListItem = (
  blocks: EditorBlock[],
  blockId: string,
  itemId: string,
  paragraph = createParagraphBlock(),
) =>
  blocks.flatMap((block) => {
    if (
      block.id !== blockId ||
      !(
        block.type === 'unordered-list' ||
        block.type === 'ordered-list' ||
        block.type === 'task-list'
      )
    ) {
      return [block]
    }
    const index = block.items.findIndex((item) => item.id === itemId)
    if (
      index < 0 ||
      getPlainTextFromHtml(block.items[index].html).trim().length > 0
    ) {
      return [block]
    }
    const before = block.items.slice(0, index)
    const after = block.items.slice(index + 1)
    return [
      ...(before.length ? [{ ...block, items: before }] : []),
      paragraph,
      ...(after.length
        ? [
            {
              ...block,
              id: before.length ? createBlockId() : block.id,
              items: after,
            },
          ]
        : []),
    ]
  })

const normalizeColumnWidths = (widths: string[], columns: number) =>
  Array.from({ length: columns }, (_, index) => widths[index] ?? '')

export type TableCellArea = {
  cell: TableCell
  row: number
  column: number
  sourceRow: number
  sourceColumn: number
}

export const getTableCellAreas = (table: TableBlock): TableCellArea[] => {
  const occupied: boolean[][] = []
  const areas: TableCellArea[] = []

  table.rows.forEach((row, rowIndex) => {
    occupied[rowIndex] ??= []
    let column = 0
    row.forEach((cell, sourceColumn) => {
      while (occupied[rowIndex][column]) column += 1
      areas.push({
        cell,
        row: rowIndex,
        column,
        sourceRow: rowIndex,
        sourceColumn,
      })
      for (let rowOffset = 0; rowOffset < cell.rowspan; rowOffset += 1) {
        occupied[rowIndex + rowOffset] ??= []
        for (
          let columnOffset = 0;
          columnOffset < cell.colspan;
          columnOffset += 1
        ) {
          occupied[rowIndex + rowOffset][column + columnOffset] = true
        }
      }
      column += cell.colspan
    })
  })

  return areas
}

export const getTableDimensions = (table: TableBlock) => {
  const areas = getTableCellAreas(table)
  return {
    rows: Math.max(
      table.rows.length,
      ...areas.map((area) => area.row + area.cell.rowspan),
      1,
    ),
    columns: Math.max(
      ...areas.map((area) => area.column + area.cell.colspan),
      1,
    ),
  }
}

const rebuildTableRows = (
  table: TableBlock,
  areas: TableCellArea[],
  rowCount: number,
): TableBlock => {
  const rows = Array.from(
    { length: Math.max(rowCount, 1) },
    () => [] as TableCell[],
  )
  areas
    .sort((left, right) => left.row - right.row || left.column - right.column)
    .forEach((area) => rows[area.row]?.push(area.cell))
  return { ...table, rows }
}

const cellCovers = (area: TableCellArea, row: number, column: number) =>
  row >= area.row &&
  row < area.row + area.cell.rowspan &&
  column >= area.column &&
  column < area.column + area.cell.colspan

export const insertTableRow = (
  table: TableBlock,
  rowIndex: number,
  placement: 'before' | 'after',
): TableBlock => {
  const dimensions = getTableDimensions(table)
  const index = Math.max(
    0,
    Math.min(rowIndex + (placement === 'after' ? 1 : 0), dimensions.rows),
  )
  const areas = getTableCellAreas(table).map((area) => {
    if (area.row < index && area.row + area.cell.rowspan > index) {
      return { ...area, cell: { ...area.cell, rowspan: area.cell.rowspan + 1 } }
    }
    return area.row >= index ? { ...area, row: area.row + 1 } : area
  })
  for (let column = 0; column < dimensions.columns; column += 1) {
    if (!areas.some((area) => cellCovers(area, index, column))) {
      areas.push({
        cell: createTableCell(),
        row: index,
        column,
        sourceRow: index,
        sourceColumn: column,
      })
    }
  }
  return rebuildTableRows(table, areas, dimensions.rows + 1)
}

export const insertTableColumn = (
  table: TableBlock,
  columnIndex: number,
  placement: 'before' | 'after',
): TableBlock => {
  const dimensions = getTableDimensions(table)
  const index = Math.max(
    0,
    Math.min(columnIndex + (placement === 'after' ? 1 : 0), dimensions.columns),
  )
  const areas = getTableCellAreas(table).map((area) => {
    if (area.column < index && area.column + area.cell.colspan > index) {
      return { ...area, cell: { ...area.cell, colspan: area.cell.colspan + 1 } }
    }
    return area.column >= index ? { ...area, column: area.column + 1 } : area
  })
  for (let row = 0; row < dimensions.rows; row += 1) {
    if (!areas.some((area) => cellCovers(area, row, index))) {
      areas.push({
        cell: createTableCell(),
        row,
        column: index,
        sourceRow: row,
        sourceColumn: index,
      })
    }
  }
  const next = rebuildTableRows(table, areas, dimensions.rows)
  next.columnWidths = [
    ...normalizeColumnWidths(table.columnWidths, dimensions.columns).slice(
      0,
      index,
    ),
    '',
    ...normalizeColumnWidths(table.columnWidths, dimensions.columns).slice(
      index,
    ),
  ]
  return next
}

export const deleteTableRow = (
  table: TableBlock,
  rowIndex: number,
): TableBlock => {
  const dimensions = getTableDimensions(table)
  if (dimensions.rows <= 1) {
    return table
  }
  const index = Math.max(0, Math.min(rowIndex, dimensions.rows - 1))
  const areas = getTableCellAreas(table).flatMap((area) => {
    const end = area.row + area.cell.rowspan
    if (area.row === index) {
      return area.cell.rowspan > 1
        ? [{ ...area, cell: { ...area.cell, rowspan: area.cell.rowspan - 1 } }]
        : []
    }
    if (area.row < index && end > index) {
      return [
        { ...area, cell: { ...area.cell, rowspan: area.cell.rowspan - 1 } },
      ]
    }
    return [area.row > index ? { ...area, row: area.row - 1 } : area]
  })
  return rebuildTableRows(table, areas, dimensions.rows - 1)
}

export const deleteTableColumn = (
  table: TableBlock,
  columnIndex: number,
): TableBlock => {
  const dimensions = getTableDimensions(table)
  if (dimensions.columns <= 1) {
    return table
  }
  const index = Math.max(0, Math.min(columnIndex, dimensions.columns - 1))
  const areas = getTableCellAreas(table).flatMap((area) => {
    const end = area.column + area.cell.colspan
    if (area.column === index) {
      return area.cell.colspan > 1
        ? [{ ...area, cell: { ...area.cell, colspan: area.cell.colspan - 1 } }]
        : []
    }
    if (area.column < index && end > index) {
      return [
        { ...area, cell: { ...area.cell, colspan: area.cell.colspan - 1 } },
      ]
    }
    return [area.column > index ? { ...area, column: area.column - 1 } : area]
  })
  const next = rebuildTableRows(table, areas, dimensions.rows)
  next.columnWidths = normalizeColumnWidths(
    table.columnWidths,
    dimensions.columns,
  ).filter((_, widthIndex) => widthIndex !== index)
  return next
}

export const setTableAlignment = (
  table: TableBlock,
  cellId: string,
  align: TextAlign,
): TableBlock => ({
  ...table,
  rows: table.rows.map((row) =>
    row.map((cell) => (cell.id === cellId ? { ...cell, align } : cell)),
  ),
})

export const getRectangularTableSelection = (
  table: TableBlock,
  anchorId: string,
  focusId: string,
) => {
  const areas = getTableCellAreas(table)
  const anchor = areas.find((area) => area.cell.id === anchorId)
  const focus = areas.find((area) => area.cell.id === focusId)
  if (!anchor || !focus) return [focusId]
  const top = Math.min(anchor.row, focus.row)
  const left = Math.min(anchor.column, focus.column)
  const bottom = Math.max(
    anchor.row + anchor.cell.rowspan,
    focus.row + focus.cell.rowspan,
  )
  const right = Math.max(
    anchor.column + anchor.cell.colspan,
    focus.column + focus.cell.colspan,
  )
  return areas
    .filter(
      (area) =>
        area.row < bottom &&
        area.row + area.cell.rowspan > top &&
        area.column < right &&
        area.column + area.cell.colspan > left,
    )
    .map((area) => area.cell.id)
}

export const mergeTableCells = (
  table: TableBlock,
  selectedIds: string[],
): TableBlock => {
  if (selectedIds.length < 2) return table
  const selected = getTableCellAreas(table).filter((area) =>
    selectedIds.includes(area.cell.id),
  )
  if (selected.length < 2) return table
  const top = Math.min(...selected.map((area) => area.row))
  const left = Math.min(...selected.map((area) => area.column))
  const bottom = Math.max(
    ...selected.map((area) => area.row + area.cell.rowspan),
  )
  const right = Math.max(
    ...selected.map((area) => area.column + area.cell.colspan),
  )
  const selectedArea = selected.reduce(
    (sum, area) => sum + area.cell.rowspan * area.cell.colspan,
    0,
  )
  if (selectedArea !== (bottom - top) * (right - left)) return table
  const anchor = selected.find(
    (area) => area.row === top && area.column === left,
  )
  if (!anchor) return table
  const ids = new Set(selectedIds)
  const areas = getTableCellAreas(table).flatMap((area) => {
    if (area.cell.id === anchor.cell.id) {
      return [
        {
          ...area,
          cell: {
            ...area.cell,
            rowspan: bottom - top,
            colspan: right - left,
          },
        },
      ]
    }
    return ids.has(area.cell.id) ? [] : [area]
  })
  return rebuildTableRows(table, areas, getTableDimensions(table).rows)
}

export const splitTableCell = (
  table: TableBlock,
  cellId: string,
): TableBlock => {
  const dimensions = getTableDimensions(table)
  const target = getTableCellAreas(table).find(
    (area) => area.cell.id === cellId,
  )
  if (!target || (target.cell.rowspan === 1 && target.cell.colspan === 1)) {
    return table
  }
  const areas = getTableCellAreas(table).map((area) =>
    area.cell.id === cellId
      ? { ...area, cell: { ...area.cell, rowspan: 1, colspan: 1 } }
      : area,
  )
  for (let row = target.row; row < target.row + target.cell.rowspan; row += 1) {
    for (
      let column = target.column;
      column < target.column + target.cell.colspan;
      column += 1
    ) {
      if (row === target.row && column === target.column) continue
      areas.push({
        cell: createTableCell(),
        row,
        column,
        sourceRow: row,
        sourceColumn: column,
      })
    }
  }
  return rebuildTableRows(table, areas, dimensions.rows)
}

export const setTableCellsAlignment = (
  table: TableBlock,
  cellIds: string[],
  align: TextAlign,
): TableBlock => ({
  ...table,
  rows: table.rows.map((row) =>
    row.map((cell) => (cellIds.includes(cell.id) ? { ...cell, align } : cell)),
  ),
})

export const clearTableCells = (
  table: TableBlock,
  cellIds: string[],
): TableBlock => ({
  ...table,
  rows: table.rows.map((row) =>
    row.map((cell) =>
      cellIds.includes(cell.id) ? { ...cell, html: '' } : cell,
    ),
  ),
})

export const setTableColumnWidth = (
  table: TableBlock,
  columnIndex: number,
  width: number,
): TableBlock => {
  const columns = getTableDimensions(table).columns
  if (columnIndex < 0 || columnIndex >= columns) return table
  const widths = normalizeColumnWidths(table.columnWidths, columns)
  widths[columnIndex] = `${Math.max(80, Math.min(640, Math.round(width)))}px`
  return { ...table, columnWidths: widths }
}
