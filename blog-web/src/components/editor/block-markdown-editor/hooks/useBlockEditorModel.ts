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
import {
  convertSelectedBlocksToParagraph,
  formatSelectedBlocks,
  removeSelectedBlocks,
  type BulkInlineFormat,
} from '../core/bulkCommands'
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
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([])
  const selectionAnchorRef = useRef<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const lastFocusedBlockIdRef = useRef<string | null>(null)
  const blocksRef = useRef(blocks)
  const historyRef = useRef(createHistory(blocks))
  const focusedRef = useRef(false)
  const pendingExternalValueRef = useRef<string | null>(null)
  const onChangeRef = useRef(onChange)

  onChangeRef.current = onChange

  const applyExternalValue = useCallback((nextValue: string) => {
    const parsed = parseMarkdownToBlocks(nextValue)
    blocksRef.current = parsed
    historyRef.current = createHistory(parsed)
    setBlocks(parsed)
    setInsertAfterId(null)
    setToolbarBlockId(null)
    setSelectedBlockIds([])
    selectionAnchorRef.current = null
    pendingExternalValueRef.current = null
  }, [])

  useEffect(() => {
    if (value === serializeBlocksToMarkdown(blocksRef.current)) {
      pendingExternalValueRef.current = null
      return
    }
    if (focusedRef.current) {
      pendingExternalValueRef.current = value
      return
    }
    applyExternalValue(value)
  }, [applyExternalValue, value])

  const handleEditorBlur = useCallback(() => {
    const stillFocused = Boolean(
      editorRef.current?.contains(document.activeElement),
    )
    focusedRef.current = stillFocused
    if (stillFocused || pendingExternalValueRef.current === null) return
    applyExternalValue(pendingExternalValueRef.current)
  }, [applyExternalValue])

  const emit = useCallback((next: EditorBlock[]) => {
    blocksRef.current = next
    setBlocks(next)
    const markdown = serializeBlocksToMarkdown(next)
    onChangeRef.current(markdown)
    setSelectedBlockIds((current) =>
      current.filter((blockId) => next.some((block) => block.id === blockId)),
    )
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

  const selectBlock = useCallback(
    (blockId: string, mode: 'toggle' | 'range') => {
      const ids = blocksRef.current.map((block) => block.id)
      if (mode === 'range') {
        const anchor = selectionAnchorRef.current ?? blockId
        const start = ids.indexOf(anchor)
        const end = ids.indexOf(blockId)
        if (start < 0 || end < 0) return
        const [from, to] = start < end ? [start, end] : [end, start]
        setSelectedBlockIds(ids.slice(from, to + 1))
        return
      }
      setSelectedBlockIds((current) =>
        current.includes(blockId)
          ? current.filter((id) => id !== blockId)
          : [...current, blockId],
      )
      selectionAnchorRef.current = blockId
    },
    [],
  )

  const clearBlockSelection = useCallback(() => {
    selectionAnchorRef.current = null
    setSelectedBlockIds([])
  }, [])

  const deleteSelectedBlocks = useCallback(() => {
    const selected = selectedBlockIds
    if (!selected.length) return
    const current = blocksRef.current
    const firstIndex = current.findIndex((block) => selected.includes(block.id))
    const next = removeSelectedBlocks(current, selected)
    const focusId = next[Math.min(firstIndex, next.length - 1)]?.id
    commit(next)
    clearBlockSelection()
    if (focusId) focusBlock(focusId)
  }, [clearBlockSelection, commit, focusBlock, selectedBlockIds])

  const convertSelectedToParagraph = useCallback(() => {
    if (!selectedBlockIds.length) return
    commit(
      convertSelectedBlocksToParagraph(blocksRef.current, selectedBlockIds),
    )
  }, [commit, selectedBlockIds])

  const formatSelected = useCallback(
    (tag: BulkInlineFormat) => {
      if (!selectedBlockIds.length) return
      commit(formatSelectedBlocks(blocksRef.current, selectedBlockIds, tag))
    },
    [commit, selectedBlockIds],
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

  const splitTextBlock = useCallback(
    (blockId: string, beforeHtml: string, afterHtml: string) => {
      const current = blocksRef.current
      const index = current.findIndex((block) => block.id === blockId)
      const block = current[index]
      if (
        index < 0 ||
        !block ||
        !(
          block.type === 'paragraph' ||
          block.type === 'heading' ||
          block.type === 'quote'
        )
      ) {
        return
      }
      const paragraph = { ...createParagraphBlock(), html: afterHtml }
      const updatedBlock = { ...block, html: beforeHtml }
      commit([
        ...current.slice(0, index),
        updatedBlock,
        paragraph,
        ...current.slice(index + 1),
      ])
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
    lastFocusedBlockIdRef,
    focusedRef,
    handleEditorBlur,
    insertAfterId,
    setInsertAfterId,
    toolbarBlockId,
    setToolbarBlockId,
    shortcutDrawerOpen,
    setShortcutDrawerOpen,
    selectedBlockIds,
    selectBlock,
    clearBlockSelection,
    deleteSelectedBlocks,
    convertSelectedToParagraph,
    formatSelected,
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
    splitTextBlock,
    convertShortcut,
  }
}

export type BlockEditorModel = ReturnType<typeof useBlockEditorModel>

export const isEmptyEditorBlock = isBlockEmpty
