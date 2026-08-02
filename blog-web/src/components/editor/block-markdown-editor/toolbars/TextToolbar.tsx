import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom'
import {
  Bold,
  Code2,
  Highlighter,
  Italic,
  Link,
  Palette,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Unlink,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  allowedBackgroundColors,
  allowedTextColors,
} from '../markdown/markdownSchema'
import type { EditorSelection } from '../utils/dom'
import { createRangeReference } from '../utils/dom'

type TextToolbarProps = {
  selection: EditorSelection
  onClose: () => void
  onToggleFormat: (format: 'strong' | 'em' | 'u' | 'del' | 'code') => void
  onSetLink: (value: string) => boolean
  onRemoveLink: () => void
  onSetStyle: (property: 'color' | 'background-color', value: string) => void
  onClearFormat: () => void
}

const formatActions = [
  { label: '加粗', format: 'strong', icon: Bold },
  { label: '斜体', format: 'em', icon: Italic },
  { label: '下划线', format: 'u', icon: Underline },
  { label: '删除线', format: 'del', icon: Strikethrough },
  { label: '行内代码', format: 'code', icon: Code2 },
] satisfies Array<{
  label: string
  format: 'strong' | 'em' | 'u' | 'del' | 'code'
  icon: typeof Bold
}>

export const TextToolbar = ({
  selection,
  onClose,
  onToggleFormat,
  onSetLink,
  onRemoveLink,
  onSetStyle,
  onClearFormat,
}: TextToolbarProps) => {
  const [colorMenu, setColorMenu] = useState<
    'color' | 'background-color' | null
  >(null)
  const { refs, floatingStyles } = useFloating({
    open: true,
    placement: 'top',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  useEffect(() => {
    refs.setReference(createRangeReference(selection))
    return () => refs.setReference(null)
  }, [refs, selection])

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const colors =
    colorMenu === 'color' ? allowedTextColors : allowedBackgroundColors
  const colorLabel = colorMenu === 'color' ? '文字颜色' : '背景高亮'

  return (
    <div
      ref={refs.setFloating}
      aria-label="文字工具"
      className="block-editor__toolbar block-editor__text-toolbar"
      role="toolbar"
      style={floatingStyles}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="block-editor__toolbar-group">
        {formatActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.format}
              aria-label={action.label}
              title={action.label}
              type="button"
              onClick={() => onToggleFormat(action.format)}
            >
              <Icon aria-hidden="true" />
            </button>
          )
        })}
      </div>
      <div className="block-editor__toolbar-group">
        <button
          aria-label="设置链接"
          title="设置链接"
          type="button"
          onClick={() => {
            const value = window.prompt('输入链接地址')
            if (value !== null && !onSetLink(value)) {
              window.alert('链接仅支持 http、https、mailto、站内路径或锚点')
            }
          }}
        >
          <Link aria-hidden="true" />
        </button>
        <button
          aria-label="取消链接"
          title="取消链接"
          type="button"
          onClick={onRemoveLink}
        >
          <Unlink aria-hidden="true" />
        </button>
        <button
          aria-expanded={colorMenu === 'color'}
          aria-label="文字颜色"
          title="文字颜色"
          type="button"
          onClick={() =>
            setColorMenu((current) => (current === 'color' ? null : 'color'))
          }
        >
          <Palette aria-hidden="true" />
        </button>
        <button
          aria-expanded={colorMenu === 'background-color'}
          aria-label="背景高亮"
          title="背景高亮"
          type="button"
          onClick={() =>
            setColorMenu((current) =>
              current === 'background-color' ? null : 'background-color',
            )
          }
        >
          <Highlighter aria-hidden="true" />
        </button>
        <button
          aria-label="清除格式"
          title="清除格式"
          type="button"
          onClick={onClearFormat}
        >
          <RemoveFormatting aria-hidden="true" />
        </button>
      </div>
      {colorMenu ? (
        <div
          aria-label={colorLabel}
          className="block-editor__color-menu"
          role="group"
        >
          {colors.map((color) => (
            <button
              key={color}
              aria-label={`${colorLabel} ${color}`}
              className="block-editor__color-swatch"
              style={{ backgroundColor: color }}
              title={color}
              type="button"
              onClick={() => onSetStyle(colorMenu, color)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
