import {
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { moveBlock, removeBlock } from '../core/commands'
import { isBlockEmpty } from '../core/blockModel'
import type { EditorBlock } from '../types'
import { getClipboardBlocks } from '../utils/clipboard'
import {
  commitEditorSelection,
  getEditorSelection,
  normalizeEditorLink,
  resolveEditorSelection,
  splitEditorAtCaret,
  selectEditorWordAtPoint,
  setSelectionLink,
  toggleInlineTag,
  type EditorSelection,
} from '../utils/dom'
import type { BlockEditorModel } from './useBlockEditorModel'

const floatingUiInteractiveSelector = [
  '.block-editor__text-toolbar',
  '.block-editor__block-toolbar',
  '.block-editor__insert-menu',
  '.block-editor__shortcut-drawer',
  '.block-editor__table-menu',
  '.block-editor__image-toolbar',
  '.block-editor__block-handle',
  '.block-editor__insert-button',
  '.block-editor__utility-bar',
].join(', ')

const isSameTextSelection = (
  current: EditorSelection | null,
  next: EditorSelection | null,
) =>
  current?.editable === next?.editable &&
  current?.start === next?.start &&
  current?.end === next?.end

export const useBlockEditorInteractions = (
  model: BlockEditorModel,
  readOnly: boolean,
  onSaveShortcut?: () => void,
  onImagePasteRejected?: () => void,
) => {
  const [textSelection, setTextSelection] = useState<EditorSelection | null>(
    null,
  )
  const textSelectionRef = useRef<EditorSelection | null>(null)
  const pendingContextSelectionRef = useRef<EditorSelection | null>(null)
  textSelectionRef.current = textSelection

  const dismissTextToolbar = useCallback(() => {
    pendingContextSelectionRef.current = null
    textSelectionRef.current = null
    setTextSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  const dismissFloatingUi = useCallback(() => {
    if (textSelectionRef.current) dismissTextToolbar()
    model.setToolbarBlockId(null)
    model.setInsertAfterId(null)
    model.setShortcutDrawerOpen(false)
  }, [dismissTextToolbar, model])

  useEffect(() => {
    if (readOnly) {
      dismissTextToolbar()
      return
    }
    const updateTextSelection = () => {
      const next = getEditorSelection(model.editorRef.current)
      if (!next && pendingContextSelectionRef.current) return
      textSelectionRef.current = next
      setTextSelection((current) =>
        isSameTextSelection(current, next) ? current : next,
      )
      if (next) {
        model.setInsertAfterId(null)
        model.setToolbarBlockId(null)
        model.setShortcutDrawerOpen(false)
      }
    }
    document.addEventListener('selectionchange', updateTextSelection)
    return () =>
      document.removeEventListener('selectionchange', updateTextSelection)
  }, [dismissTextToolbar, model, readOnly])

  useEffect(() => {
    const hasOpenFloatingUi = Boolean(
      textSelection ||
      model.toolbarBlockId ||
      model.insertAfterId ||
      model.shortcutDrawerOpen,
    )
    if (!hasOpenFloatingUi) return
    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(floatingUiInteractiveSelector)) return
      dismissFloatingUi()
    }
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      dismissFloatingUi()
    }
    document.addEventListener('pointerdown', closeOnPointerDown, true)
    document.addEventListener('keydown', closeOnEscape, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown, true)
      document.removeEventListener('keydown', closeOnEscape, true)
    }
  }, [dismissFloatingUi, model, textSelection])

  const pasteBlocks = (event: ClipboardEvent<HTMLDivElement>) => {
    if (readOnly) return
    const containsImage =
      Array.from(event.clipboardData.items ?? []).some(
        (item) => item.kind === 'file' && item.type.startsWith('image/'),
      ) ||
      Array.from(event.clipboardData.files ?? []).some((file) =>
        file.type.startsWith('image/'),
      )
    if (containsImage) {
      event.preventDefault()
      onImagePasteRejected?.()
      return
    }
    const target = event.target as HTMLElement
    const blockId =
      target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId
    if (!blockId) return
    const pasted = getClipboardBlocks(event.clipboardData)
    if (!pasted.length) return
    event.preventDefault()
    const current = model.blocksRef.current
    const index = current.findIndex((block) => block.id === blockId)
    if (index < 0) return
    model.commit([
      ...current.slice(0, index + 1),
      ...pasted,
      ...current.slice(index + 1),
    ])
    model.focusBlock(pasted[0].id)
  }

  const runTextCommand = (command: (selection: EditorSelection) => void) => {
    const selection = textSelectionRef.current
    if (!selection) return
    pendingContextSelectionRef.current = null
    const currentSelection = resolveEditorSelection(selection)
    command(currentSelection)
    commitEditorSelection(currentSelection)
    textSelectionRef.current = null
    setTextSelection(null)
  }

  const setTextLink = (value: string) => {
    const href = normalizeEditorLink(value)
    if (!href) return false
    runTextCommand((selection) => setSelectionLink(selection, href))
    return true
  }

  const blockKeyDown =
    (block: EditorBlock) => (event: KeyboardEvent<HTMLElement>) => {
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && !event.altKey && textSelectionRef.current) {
        const key = event.key.toLowerCase()
        const format =
          key === 'b'
            ? 'strong'
            : key === 'i'
              ? 'em'
              : key === 'u'
                ? 'u'
                : key === 'x' && event.shiftKey
                  ? 'del'
                  : null
        if (format) {
          event.preventDefault()
          runTextCommand((selection) => toggleInlineTag(selection, format))
          return
        }
        if (key === 'k') {
          event.preventDefault()
          const value = window.prompt('输入链接地址')
          if (value !== null && !setTextLink(value)) {
            window.alert('链接仅支持 http、https、mailto、站内路径或锚点')
          }
          return
        }
      }
      if (
        !readOnly &&
        event.key === 'Enter' &&
        !event.nativeEvent.isComposing &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        (block.type === 'paragraph' ||
          block.type === 'heading' ||
          block.type === 'quote')
      ) {
        const split = splitEditorAtCaret(event.currentTarget)
        if (!split) return
        event.preventDefault()
        model.splitTextBlock(block.id, split.beforeHtml, split.afterHtml)
      }
    }

  const editorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return
    if (event.key === 'Escape' && model.shortcutDrawerOpen) {
      event.preventDefault()
      model.setShortcutDrawerOpen(false)
      return
    }
    const target = event.target as HTMLElement
    const editorInput = target.closest<HTMLElement>('[data-editor-input]')
    const modifier = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    if (
      editorInput &&
      modifier &&
      key === 's' &&
      !event.altKey &&
      !event.shiftKey &&
      onSaveShortcut
    ) {
      event.preventDefault()
      onSaveShortcut?.()
      return
    }
    if (editorInput && modifier && !event.altKey && key === 'z') {
      event.preventDefault()
      model.applyHistory(event.shiftKey ? 'redo' : 'undo')
      return
    }
    if (
      editorInput &&
      modifier &&
      !event.altKey &&
      key === 'y' &&
      !event.shiftKey
    ) {
      event.preventDefault()
      model.applyHistory('redo')
      return
    }
    const blockId =
      target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId
    if (!blockId) return
    if (!target.closest<HTMLElement>('[data-editor-input]')) return
    if (
      event.key === 'Backspace' &&
      !modifier &&
      !event.altKey &&
      !event.shiftKey
    ) {
      const current = model.blocksRef.current
      const index = current.findIndex((block) => block.id === blockId)
      const block = current[index]
      const selection = window.getSelection()
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null
      const caretInsideInput =
        selection?.isCollapsed &&
        range &&
        editorInput?.contains(range.startContainer)
      const isEmptyTextBlock =
        block &&
        (block.type === 'paragraph' ||
          block.type === 'heading' ||
          block.type === 'quote') &&
        isBlockEmpty(block)
      if (index > 0 && caretInsideInput && isEmptyTextBlock) {
        event.preventDefault()
        model.commit(removeBlock(current, blockId))
        model.focusBlock(current[index - 1].id)
        return
      }
    }
    if (
      event.altKey &&
      !modifier &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown')
    ) {
      event.preventDefault()
      model.commit(
        moveBlock(
          model.blocksRef.current,
          blockId,
          event.key === 'ArrowUp' ? 'up' : 'down',
        ),
      )
      model.focusBlock(blockId)
      return
    }
  }

  const getTextToolbarSelection = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (readOnly) return null
    const target = event.target as HTMLElement
    const editable = target.closest<HTMLElement>('[data-editor-input]')
    if (
      !editable ||
      editable.matches('textarea') ||
      editable.hasAttribute('data-table-cell-input')
    ) {
      return null
    }
    const currentSelection = getEditorSelection(model.editorRef.current)
    return (
      (currentSelection?.editable === editable ? currentSelection : null) ??
      selectEditorWordAtPoint(
        model.editorRef.current,
        event.clientX,
        event.clientY,
      )
    )
  }

  const showTextToolbar = (selection: EditorSelection) => {
    model.setInsertAfterId(null)
    model.setToolbarBlockId(null)
    model.setShortcutDrawerOpen(false)
    textSelectionRef.current = selection
    setTextSelection(selection)
  }

  const openTextToolbarOnRightMouseDown = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 2) return
    const selection = getTextToolbarSelection(event)
    if (!selection) return
    event.preventDefault()
    pendingContextSelectionRef.current = selection
    showTextToolbar(selection)
  }

  const openTextToolbarOnContextMenu = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    const target = event.target as HTMLElement
    const editable = target.closest<HTMLElement>('[data-editor-input]')
    if (
      !editable ||
      editable.matches('textarea') ||
      editable.hasAttribute('data-table-cell-input')
    )
      return
    event.preventDefault()
    const selection = getTextToolbarSelection(event)
    const fallbackSelection = selection ?? pendingContextSelectionRef.current
    if (fallbackSelection) showTextToolbar(fallbackSelection)
    const { clientX, clientY } = event
    requestAnimationFrame(() => {
      const next =
        fallbackSelection ??
        selectEditorWordAtPoint(model.editorRef.current, clientX, clientY)
      pendingContextSelectionRef.current = null
      if (next) showTextToolbar(next)
    })
  }

  return {
    textSelection,
    dismissTextToolbar,
    dismissFloatingUi,
    pasteBlocks,
    runTextCommand,
    setTextLink,
    blockKeyDown,
    editorKeyDown,
    openTextToolbarOnRightMouseDown,
    openTextToolbarOnContextMenu,
  }
}

export type BlockEditorInteractions = ReturnType<
  typeof useBlockEditorInteractions
>
