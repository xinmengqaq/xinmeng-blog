import { ImageUp, Keyboard, Plus } from 'lucide-react'
import type { MouseEvent as ReactMouseEvent } from 'react'

import { CodeBlock } from './blocks/CodeBlock'
import { DividerBlock } from './blocks/DividerBlock'
import { HeadingBlock } from './blocks/HeadingBlock'
import { ImageBlock } from './blocks/ImageBlock'
import { ListBlock } from './blocks/ListBlock'
import { ParagraphBlock } from './blocks/ParagraphBlock'
import { QuoteBlock } from './blocks/QuoteBlock'
import { TableBlock } from './blocks/TableBlock'
import {
  clearSelectionFormatting,
  removeSelectionLink,
  setSelectionStyle,
  toggleInlineTag,
} from './utils/dom'
import type { BlockEditorInteractions } from './hooks/useBlockEditorInteractions'
import type { EditorImageUpload } from './hooks/useEditorImageUpload'
import { useSelectedEditorImage } from './hooks/useSelectedEditorImage'
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

  const deleteBlock = (block: EditorBlock) => {
    if (block.type === 'image') {
      imageUpload.setRemoveBlock(block)
      return
    }
    model.deleteToolbarBlock(block.id)
  }

  const renderBlock = (block: EditorBlock) => {
    const onKeyDown = interactions.blockKeyDown(block)
    switch (block.type) {
      case 'paragraph':
        return (
          <ParagraphBlock
            block={block}
            placeholder={
              model.blocks[0]?.id === block.id ? placeholder : undefined
            }
            readOnly={readOnly}
            onChange={model.replaceBlock}
            onKeyDown={onKeyDown}
            onTextChange={(text) => model.convertShortcut(block.id, text)}
          />
        )
      case 'heading':
        return (
          <HeadingBlock
            block={block}
            readOnly={readOnly}
            onChange={model.replaceBlock}
            onKeyDown={onKeyDown}
          />
        )
      case 'quote':
        return (
          <QuoteBlock
            block={block}
            readOnly={readOnly}
            onChange={model.replaceBlock}
            onKeyDown={onKeyDown}
          />
        )
      case 'unordered-list':
      case 'ordered-list':
      case 'task-list':
        return (
          <ListBlock
            block={block}
            readOnly={readOnly}
            onChange={model.replaceBlock}
            onExitItem={(itemId) => model.exitListBlockItem(block.id, itemId)}
            onKeyDown={onKeyDown}
          />
        )
      case 'code':
        return (
          <CodeBlock
            block={block}
            readOnly={readOnly}
            onChange={model.replaceBlock}
          />
        )
      case 'image':
        return (
          <ImageBlock
            block={block}
            readOnly={readOnly}
            selected={selectedImage.selection?.blockId === block.id}
            onSelect={(anchor) => {
              model.setInsertAfterId(null)
              model.setToolbarBlockId(null)
              interactions.dismissTextToolbar()
              selectedImage.select(block.id, anchor)
            }}
          />
        )
      case 'table':
        return (
          <TableBlock
            block={block}
            readOnly={readOnly}
            onChange={model.replaceBlock}
            onDelete={() => model.deleteToolbarBlock(block.id)}
            onKeyDown={onKeyDown}
          />
        )
      case 'divider':
        return <DividerBlock />
    }
  }

  const closeShortcutDrawer = () => model.setShortcutDrawerOpen(false)
  const openShortcutDrawer = () => {
    model.setToolbarBlockId(null)
    model.setInsertAfterId(null)
    interactions.dismissTextToolbar()
    model.setShortcutDrawerOpen((current) => !current)
  }
  const onRootBlur = () => {
    requestAnimationFrame(() => {
      model.focusedRef.current = Boolean(
        model.editorRef.current?.contains(document.activeElement),
      )
    })
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
      onFocus={() => {
        model.focusedRef.current = true
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
      onPaste={interactions.pasteBlocks}
    >
      {!readOnly ? (
        <div className="block-editor__utility-bar">
          <button
            aria-label="上传图片"
            disabled={disabled}
            title="上传图片"
            type="button"
            onClick={() => imageUpload.openInsert()}
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
              {renderBlock(block)}
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
