import { useCallback, useEffect, useRef, useState } from 'react'

import {
  convertBlockType,
  createBlockByType,
  duplicateBlock,
  exitListItem,
  insertBlockAfter,
  moveBlock,
  removeBlock,
  updateBlock,
} from '../core/commands'
import { createParagraphBlock, isBlockEmpty } from '../core/blockModel'
import {
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from '../core/history'
import { parseMarkdownToBlocks } from '../markdown/parseMarkdown'
import { serializeBlocksToMarkdown } from '../markdown/serializeMarkdown'
import type { BlockInsertChoice } from '../toolbars/BlockInsertMenu'
import type { EditorBlock, ImageBlock } from '../types'
import { getMarkdownBlockShortcut } from '../utils/keyboard'

export const useBlockEditorModel = (
  value: string,
  onChange: (value: string) => void,
) => {
  const [blocks, setBlocks] = useState(() => parseMarkdownToBlocks(value))
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null)
  const [toolbarBlockId, setToolbarBlockId] = useState<string | null>(null)
  const [shortcutDrawerOpen, setShortcutDrawerOpen] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const blocksRef = useRef(blocks)
  const historyRef = useRef(createHistory(blocks))
  const focusedRef = useRef(false)
  const lastEmittedValue = useRef<string | null>(null)
  const onChangeRef = useRef(onChange)

  onChangeRef.current = onChange

  useEffect(() => {
    if (value === lastEmittedValue.current || focusedRef.current) return
    const parsed = parseMarkdownToBlocks(value)
    blocksRef.current = parsed
    historyRef.current = createHistory(parsed)
    setBlocks(parsed)
  }, [value])

  const emit = useCallback((next: EditorBlock[]) => {
    blocksRef.current = next
    setBlocks(next)
    const markdown = serializeBlocksToMarkdown(next)
    lastEmittedValue.current = markdown
    onChangeRef.current(markdown)
  }, [])

  const commit = useCallback(
    (next: EditorBlock[]) => {
      historyRef.current = pushHistory(historyRef.current, next)
      emit(next)
    },
    [emit],
  )

  const applyHistory = useCallback(
    (direction: 'undo' | 'redo') => {
      const current = historyRef.current
      const next =
        direction === 'undo' ? undoHistory(current) : redoHistory(current)
      if (next === current) return
      historyRef.current = next
      emit(next.present)
    },
    [emit],
  )

  const focusBlock = useCallback((blockId: string) => {
    requestAnimationFrame(() => {
      Array.from(
        editorRef.current?.querySelectorAll<HTMLElement>('[data-block-id]') ??
          [],
      )
        .find((element) => element.dataset.blockId === blockId)
        ?.querySelector<HTMLElement>('[data-editor-input]')
        ?.focus()
    })
  }, [])

  const replaceBlock = useCallback(
    (block: EditorBlock) =>
      commit(updateBlock(blocksRef.current, block.id, block)),
    [commit],
  )

  const insertBlock = useCallback(
    (choice: BlockInsertChoice) => {
      if (!insertAfterId) return
      let block = createBlockByType(choice.type)
      if (block.type === 'heading' && choice.level) {
        block = { ...block, level: choice.level }
      }
      commit(insertBlockAfter(blocksRef.current, insertAfterId, block))
      setInsertAfterId(null)
      focusBlock(block.id)
    },
    [commit, focusBlock, insertAfterId],
  )

  const insertToolbarBlock = useCallback(
    (blockId: string, type: EditorBlock['type']) => {
      const block = createBlockByType(type)
      commit(insertBlockAfter(blocksRef.current, blockId, block))
      focusBlock(block.id)
    },
    [commit, focusBlock],
  )

  const insertImageBlock = useCallback(
    (url: string, alt = '', afterId?: string) => {
      const image = {
        ...createBlockByType('image'),
        url,
        alt,
      } as ImageBlock
      const current = blocksRef.current
      const anchorId = afterId ?? current.at(-1)?.id
      const next = anchorId
        ? insertBlockAfter(current, anchorId, image)
        : [image]
      commit(next)
      setInsertAfterId(null)
    },
    [commit],
  )

  const convertToolbarBlock = useCallback(
    (blockId: string, choice: BlockInsertChoice) => {
      let next = convertBlockType(blocksRef.current, blockId, choice.type)
      if (choice.type === 'heading' && choice.level) {
        next = updateBlock(next, blockId, { level: choice.level })
      }
      commit(next)
      focusBlock(blockId)
    },
    [commit, focusBlock],
  )

  const moveToolbarBlock = useCallback(
    (blockId: string, direction: 'up' | 'down') => {
      commit(moveBlock(blocksRef.current, blockId, direction))
      focusBlock(blockId)
    },
    [commit, focusBlock],
  )

  const duplicateToolbarBlock = useCallback(
    (blockId: string) => {
      commit(duplicateBlock(blocksRef.current, blockId))
      focusBlock(blockId)
    },
    [commit, focusBlock],
  )

  const deleteToolbarBlock = useCallback(
    (blockId: string) => {
      const current = blocksRef.current
      const index = current.findIndex((block) => block.id === blockId)
      const focusId = current[index + 1]?.id ?? current[index - 1]?.id
      commit(removeBlock(current, blockId))
      if (focusId) focusBlock(focusId)
    },
    [commit, focusBlock],
  )

  const exitListBlockItem = useCallback(
    (blockId: string, itemId: string) => {
      const paragraph = createParagraphBlock()
      commit(exitListItem(blocksRef.current, blockId, itemId, paragraph))
      focusBlock(paragraph.id)
    },
    [commit, focusBlock],
  )

  const convertShortcut = useCallback(
    (blockId: string, text: string) => {
      const shortcut = getMarkdownBlockShortcut(text)
      if (!shortcut) return
      let next = convertBlockType(blocksRef.current, blockId, shortcut.type)
      if (shortcut.type === 'heading' && shortcut.level) {
        next = updateBlock(next, blockId, { level: shortcut.level, html: '' })
      } else if (shortcut.type !== 'divider') {
        next = updateBlock(next, blockId, { html: '', code: '' })
      }
      commit(next)
      focusBlock(blockId)
    },
    [commit, focusBlock],
  )

  return {
    blocks,
    blocksRef,
    editorRef,
    focusedRef,
    insertAfterId,
    setInsertAfterId,
    toolbarBlockId,
    setToolbarBlockId,
    shortcutDrawerOpen,
    setShortcutDrawerOpen,
    commit,
    applyHistory,
    focusBlock,
    replaceBlock,
    insertBlock,
    insertToolbarBlock,
    insertImageBlock,
    convertToolbarBlock,
    moveToolbarBlock,
    duplicateToolbarBlock,
    deleteToolbarBlock,
    exitListBlockItem,
    convertShortcut,
  }
}

export type BlockEditorModel = ReturnType<typeof useBlockEditorModel>

export const isEmptyEditorBlock = isBlockEmpty
