import { BlockEditorSurface } from './BlockEditorSurface'
import { EditorImageDialogs } from './EditorImageDialogs'
import { useBlockEditorInteractions } from './hooks/useBlockEditorInteractions'
import { useEditorImageUpload } from './hooks/useEditorImageUpload'
import { useBlockEditorModel } from './hooks/useBlockEditorModel'
import type { BlockMarkdownEditorProps } from './types'
import './blockMarkdownEditor.css'

export const BlockMarkdownEditor = ({
  value,
  onChange,
  readOnly = false,
  disabled = false,
  placeholder = '输入正文，或按 / 插入内容块',
  className,
  onSaveShortcut,
  imageDrafts = new Map(),
  onImageDraftCreate,
  onImageDraftRelease,
}: BlockMarkdownEditorProps) => {
  const model = useBlockEditorModel(value, onChange)
  const imageUpload = useEditorImageUpload({
    model,
    imageDrafts,
    onDraftCreate: onImageDraftCreate,
    onDraftRelease: onImageDraftRelease,
  })
  const interactions = useBlockEditorInteractions(
    model,
    readOnly,
    onSaveShortcut,
    () => imageUpload.setError('不支持粘贴图片，请使用“上传图片”按钮'),
  )

  return (
    <>
      <BlockEditorSurface
        className={className}
        disabled={disabled}
        imageUpload={imageUpload}
        interactions={interactions}
        model={model}
        placeholder={placeholder}
        readOnly={readOnly}
      />
      <EditorImageDialogs disabled={disabled} imageUpload={imageUpload} />
    </>
  )
}
