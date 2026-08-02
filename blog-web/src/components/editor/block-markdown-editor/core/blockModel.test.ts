import { afterEach, describe, expect, it } from 'vitest'

import {
  convertBlockType,
  duplicateBlock,
  moveBlock,
  removeBlock,
} from './commands'
import {
  createDefaultTableBlock,
  createHeadingBlock,
  createParagraphBlock,
  ensureNonEmptyDocument,
  setBlockIdFactory,
} from './blockModel'
import { createHistory, pushHistory, redoHistory, undoHistory } from './history'

describe('块状 Markdown 编辑器块模型', () => {
  let nextId = 0

  afterEach(() => setBlockIdFactory())

  it('空内容应生成一个可编辑段落块', () => {
    setBlockIdFactory(() => `test-${++nextId}`)

    expect(ensureNonEmptyDocument([])).toEqual([
      { id: expect.any(String), type: 'paragraph', html: '' },
    ])
  })

  it('块模型应保持稳定标识并支持移动复制删除和类型转换', () => {
    setBlockIdFactory(() => `test-${++nextId}`)
    const first = createParagraphBlock('第一段')
    const second = createHeadingBlock(2, '标题')
    const blocks = [first, second]

    const moved = moveBlock(blocks, second.id, 'up')
    expect(moved.map((block) => block.id)).toEqual([second.id, first.id])

    const duplicated = duplicateBlock(moved, first.id)
    expect(duplicated).toHaveLength(3)
    expect(duplicated[2]).toMatchObject({ type: 'paragraph', html: '第一段' })
    expect(duplicated[2].id).not.toBe(first.id)

    const converted = convertBlockType(duplicated, first.id, 'quote')
    expect(converted[1]).toEqual({ ...first, type: 'quote' })

    const removed = removeBlock(converted, second.id)
    expect(removed.some((block) => block.id === second.id)).toBe(false)
  })

  it('默认表格和历史撤销重做应保留业务内容', () => {
    setBlockIdFactory(() => `test-${++nextId}`)
    const paragraph = createParagraphBlock('原始')
    const table = createDefaultTableBlock()
    expect(table.rows).toHaveLength(3)
    expect(table.rows.every((row) => row.length === 3)).toBe(true)

    const history = pushHistory(createHistory([paragraph]), [
      { ...paragraph, html: '修改后' },
      table,
    ])
    const undone = undoHistory(history)
    expect(undone.present).toEqual([paragraph])
    expect(redoHistory(undone).present).toEqual(history.present)
  })
})
