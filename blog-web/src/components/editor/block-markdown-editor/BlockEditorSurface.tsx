import { ImageUp, Keyboard, Plus } from 'lucide-react'
import type { MouseEvent as ReactMouseEvent } from 'react'

import { EditorBlockContent } from './EditorBlockContent'
import {
  clearSelectionFormatting,
  removeSelectionLink,
  setSelectionStyle,
  toggleInlineTag,
} from './utils/dom'
import type { BlockEditorInteractions } from './hooks/useBlockEditorInteractions'
import type { EditorImageUpload } from './hooks/useEditorImageUpload'
import { useSelectedEditorImage } from './hooks/useSelectedEditorImage'
import { useBlockSelectionDrag } from './hooks/useBlockSelectionDrag'
import {
  isEmptyEditorBlock,
  type BlockEditorModel,
} from './hooks/useBlockEditorModel'
import { BlockInsertMenu } from './toolbars/BlockInsertMenu'
import { BlockToolbar } from './toolbars/BlockToolbar'
import { BlockSelectionToolbar } from './toolbars/BlockSelectionToolbar'
import { ShortcutDrawer } from './toolbars/ShortcutDrawer'
import { TextToolbar } from './toolbars/TextToolbar'
import { SelectedImageToolbar } from './toolbars/SelectedImageToolbar'
import type { BlockMarkdownEditorProps, EditorBlock } from './types'

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(' ')

type BlockEditorSurfaceProps = Pick<
  BlockMarkdownEditorProps,
  'readOnly' | 'disabled' | 'placeholder' | 'className'
> & {
  model: BlockEditorModel
  interactions: BlockEditorInteractions
  imageUpload: EditorImageUpload
}

export const BlockEditorSurface = ({
  readOnly = false,
  disabled = false,
  placeholder = '输入正文',
  className,
  model,
  interactions,
  imageUpload,
}: BlockEditorSurfaceProps) => {
  const selectedImage = useSelectedEditorImage(model)
  const selectionDrag = useBlockSelectionDrag(!readOnly && !disabled)

  const applyDraggedSelection = (blockIds: string[] | null | undefined) => {
    if (!blockIds) return
    model.clearBlockSelection()
    blockIds.forEach((blockId) => model.selectBlock(blockId, 'toggle'))
  }

  const openImageAtCaret = () => {
    const active = document.activeElement
    const block =
      active instanceof HTMLElement
        ? active.closest<HTMLElement>('[data-block-id]')
        : null
    imageUpload.openInsert(
      block?.dataset.blockId ??
        model.lastFocusedBlockIdRef.current ??
        undefined,
    )
  }

  const deleteBlock = (block: EditorBlock) => {
    if (block.type === 'image') {
      imageUpload.setRemoveBlock(block)
      return
    }
    model.deleteToolbarBlock(block.id)
  }

  const closeShortcutDrawer = () => model.setShortcutDrawerOpen(false)
  const openShortcutDrawer = () => {
    model.setToolbarBlockId(null)
    model.setInsertAfterId(null)
    interactions.dismissTextToolbar()
    model.setShortcutDrawerOpen((current) => !current)
  }
  const onRootBlur = () => {
    requestAnimationFrame(model.handleEditorBlur)
  }
  const onRootContextMenu = (event: ReactMouseEvent<HTMLDivElement>) =>
    interactions.openTextToolbarOnContextMenu(event)

  return (
    <div
      ref={model.editorRef}
      aria-label="块状 Markdown 编辑器"
      className={cx(
        'block-editor',
        readOnly && 'block-editor--readonly',
        className,
      )}
      onBlur={onRootBlur}
      onClickCapture={selectionDrag.onClickCapture}
      onFocus={() => {
        model.focusedRef.current = true
      }}
      onFocusCapture={(event) => {
        const target = event.target as HTMLElement
        const block = target.closest<HTMLElement>('[data-block-id]')
        if (block?.dataset.blockId) {
          model.lastFocusedBlockIdRef.current = block.dataset.blockId
        }
      }}
      onContextMenu={onRootContextMenu}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && model.selectedBlockIds.length) {
          event.preventDefault()
          model.clearBlockSelection()
          return
        }
        interactions.editorKeyDown(event)
      }}
      onMouseDown={(event) => {
        const target = event.target as HTMLElement
        if (
          model.selectedBlockIds.length &&
          target.closest('[data-editor-input]') &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey
        ) {
          model.clearBlockSelection()
        }
        interactions.openTextToolbarOnRightMouseDown(event)
      }}
      onPointerCancel={selectionDrag.onPointerCancel}
      onPointerDown={(event) => {
        if (selectionDrag.onPointerDown(event)) model.clearBlockSelection()
      }}
      onPointerMove={(event) =>
        applyDraggedSelection(selectionDrag.onPointerMove(event))
      }
      onPointerUp={(event) =>
        applyDraggedSelection(selectionDrag.onPointerUp(event))
      }
      onPaste={interactions.pasteBlocks}
    >
      {selectionDrag.selectionRect ? (
        <div
          aria-hidden="true"
          className="block-editor__selection-rect"
          style={selectionDrag.selectionRect}
        />
      ) : null}
      {!readOnly ? (
        <div className="block-editor__utility-bar">
          <button
            aria-label="上传图片"
            disabled={disabled}
            title="上传图片"
            type="button"
            onClick={openImageAtCaret}
          >
            <ImageUp aria-hidden="true" />
          </button>
          <button
            aria-expanded={model.shortcutDrawerOpen}
            aria-label="打开快捷键概览"
            title="快捷键概览"
            type="button"
            onClick={openShortcutDrawer}
          >
            <Keyboard aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {!readOnly && model.selectedBlockIds.length ? (
        <BlockSelectionToolbar
          count={model.selectedBlockIds.length}
          disabled={disabled}
          onClose={model.clearBlockSelection}
          onDelete={model.deleteSelectedBlocks}
          onParagraph={model.convertSelectedToParagraph}
          onFormat={model.formatSelected}
        />
      ) : null}
      <div className="block-editor__document">
        {model.blocks.map((block, index) => (
          <div
            key={block.id}
            className={`block-editor__block${model.selectedBlockIds.includes(block.id) ? ' is-multi-selected' : ''}`}
            data-selected={
              model.selectedBlockIds.includes(block.id) || undefined
            }
            data-block-id={block.id}
          >
            {!readOnly ? (
              <>
                <BlockToolbar
                  block={block}
                  disabled={disabled}
                  disableDelete={
                    model.blocks.length === 1 && isEmptyEditorBlock(block)
                  }
                  disableMoveDown={index === model.blocks.length - 1}
                  disableMoveUp={index === 0}
                  open={model.toolbarBlockId === block.id}
                  selected={model.selectedBlockIds.includes(block.id)}
                  onClose={() => model.setToolbarBlockId(null)}
                  onConvert={(choice) => {
                    if (choice.type === 'image') {
                      model.setToolbarBlockId(null)
                      imageUpload.openInsert(block.id)
                      return
                    }
                    model.convertToolbarBlock(block.id, choice)
                  }}
                  onDelete={() => deleteBlock(block)}
                  onDuplicate={() => model.duplicateToolbarBlock(block.id)}
                  onInsert={(type) => model.insertToolbarBlock(block.id, type)}
                  onMove={(direction) =>
                    model.moveToolbarBlock(block.id, direction)
                  }
                  onToggle={(modifiers) => {
                    if (
                      modifiers.ctrlKey ||
                      modifiers.metaKey ||
                      modifiers.shiftKey
                    ) {
                      model.setToolbarBlockId(null)
                      model.setInsertAfterId(null)
                      interactions.dismissTextToolbar()
                      model.setShortcutDrawerOpen(false)
                      model.selectBlock(
                        block.id,
                        modifiers.shiftKey ? 'range' : 'toggle',
                      )
                      return
                    }
                    model.clearBlockSelection()
                    selectedImage.clear()
                    model.setInsertAfterId(null)
                    interactions.dismissTextToolbar()
                    model.setShortcutDrawerOpen(false)
                    model.setToolbarBlockId((current) =>
                      current === block.id ? null : block.id,
                    )
                  }}
                />
                <button
                  aria-expanded={model.insertAfterId === block.id}
                  aria-label="在此块后插入"
                  className="block-editor__insert-button"
                  disabled={disabled}
                  title="插入内容块"
                  type="button"
                  onClick={() => {
                    model.setToolbarBlockId(null)
                    interactions.dismissTextToolbar()
                    model.setShortcutDrawerOpen(false)
                    model.setInsertAfterId((current) =>
                      current === block.id ? null : block.id,
                    )
                  }}
                >
                  <Plus aria-hidden="true" />
                </button>
              </>
            ) : null}
            <div className="block-editor__block-content">
              <EditorBlockContent
                block={block}
                interactions={interactions}
                model={model}
                placeholder={
                  model.blocks[0]?.id === block.id ? placeholder : undefined
                }
                readOnly={readOnly}
                selectedImageBlockId={selectedImage.selection?.blockId}
                onSelectImage={(blockId, anchor) => {
                  model.setInsertAfterId(null)
                  model.setToolbarBlockId(null)
                  interactions.dismissTextToolbar()
                  selectedImage.select(blockId, anchor)
                }}
              />
            </div>
            {model.insertAfterId === block.id ? (
              <BlockInsertMenu
                disabled={disabled}
                onClose={() => {
                  model.setInsertAfterId(null)
                  model.focusBlock(block.id)
                }}
                onSelect={(choice) => {
                  if (choice.type === 'image') {
                    model.setInsertAfterId(null)
                    imageUpload.openInsert(block.id)
                    return
                  }
                  model.insertBlock(choice)
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
      {!readOnly && interactions.textSelection ? (
        <TextToolbar
          selection={interactions.textSelection}
          onClearFormat={() =>
            interactions.runTextCommand(clearSelectionFormatting)
          }
          onClose={interactions.dismissTextToolbar}
          onRemoveLink={() => interactions.runTextCommand(removeSelectionLink)}
          onSetLink={interactions.setTextLink}
          onSetStyle={(property, color) =>
            interactions.runTextCommand((selection) =>
              setSelectionStyle(selection, property, color),
            )
          }
          onToggleFormat={(format) =>
            interactions.runTextCommand((selection) =>
              toggleInlineTag(selection, format),
            )
          }
        />
      ) : null}
      {!readOnly && model.shortcutDrawerOpen ? (
        <ShortcutDrawer onClose={closeShortcutDrawer} />
      ) : null}
      {!readOnly && selectedImage.selection ? (
        <SelectedImageToolbar
          anchor={selectedImage.selection.anchor}
          blockId={selectedImage.selection.blockId}
          disabled={disabled}
          imageUpload={imageUpload}
          model={model}
          onClose={selectedImage.clear}
        />
      ) : null}
    </div>
  )
}
