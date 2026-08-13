import { PencilLine, Trash2, Upload } from 'lucide-react'
import { type ChangeEvent, useRef, useState } from 'react'

import { ImageCropDialog, ImageEditorToolbar } from '@/components/image-editor'
import { Alert, Button, FormField, Modal } from '@/components/ui'
import type { ArticleCoverChange, ImageDraft } from '@/types/file'

import { ArticleCover } from './ArticleCover'

const COVER_FILE_ACCEPT =
  '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const COVER_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const COVER_FILE_EXTENSION = /\.(jpe?g|png|webp)$/i

type ArticleCoverEditorProps = {
  change: ArticleCoverChange | null
  currentCover: string
  disabled: boolean
  title: string
  onChange: (change: ArticleCoverChange | null) => void
}

const getCoverFileError = (file: File): string | null => {
  if (file.size === 0) return '封面文件不能为空，请重新选择图片'
  if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) {
    return '文章封面不支持 GIF，请选择 JPG、PNG 或 WebP 图片'
  }
  if (
    (file.type && !COVER_FILE_TYPES.has(file.type)) ||
    (!file.type && !COVER_FILE_EXTENSION.test(file.name))
  ) {
    return '请选择 JPG、JPEG、PNG 或 WebP 格式的图片'
  }
  return null
}

export const ArticleCoverEditor = ({
  change,
  currentCover,
  disabled,
  title,
  onChange,
}: ArticleCoverEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const draft = change?.kind === 'upload' ? change.draft : null
  const removePending = change?.kind === 'remove'
  const currentCoverExists = Boolean(currentCover.trim())
  const previewUrl = removePending ? '' : (draft?.previewUrl ?? currentCover)
  const statusLabel = removePending
    ? '封面将在保存文章时移除'
    : draft
      ? '新封面待保存'
      : currentCoverExists
        ? '当前封面'
        : '暂无封面'
  const toolbarState = removePending
    ? 'remove'
    : draft
      ? 'upload'
      : currentCoverExists
        ? 'current'
        : 'empty'

  const pickFile = () => {
    setFileError(null)
    fileInputRef.current?.click()
  }

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const error = getCoverFileError(file)
    if (error) {
      setFileError(error)
      return
    }
    setCropFile(file)
  }

  const applyCrop = (nextDraft: ImageDraft) => {
    onChange({ kind: 'upload', draft: nextDraft })
    setFileError(null)
  }

  return (
    <FormField label="封面图片">
      <div className="article-cover-editor">
        <ArticleCover coverUrl={previewUrl} alt={title} />
        <ImageEditorToolbar
          disabled={disabled}
          onUndo={change ? () => onChange(null) : undefined}
          state={toolbarState}
          status={statusLabel}
          undoLabel="撤销封面变更"
          undoTitle="撤销封面变更"
        >
          <Button
            disabled={disabled}
            icon={currentCoverExists || draft ? <PencilLine /> : <Upload />}
            onClick={pickFile}
            size="sm"
            variant="secondary"
          >
            {currentCoverExists || draft ? '更换封面' : '上传封面'}
          </Button>
          {currentCoverExists && !removePending ? (
            <Button
              aria-label="移除封面"
              className="image-editor-toolbar__icon-action"
              disabled={disabled}
              icon={<Trash2 />}
              onClick={() => setRemoveOpen(true)}
              size="sm"
              title="移除封面"
              variant="ghost"
            />
          ) : null}
        </ImageEditorToolbar>
        {fileError ? <Alert type="error">{fileError}</Alert> : null}
      </div>

      <input
        ref={fileInputRef}
        accept={COVER_FILE_ACCEPT}
        aria-hidden="true"
        className="admin-visually-hidden"
        onChange={selectFile}
        tabIndex={-1}
        type="file"
      />

      <ImageCropDialog
        file={cropFile}
        open={Boolean(cropFile)}
        target="cover"
        onApply={applyCrop}
        onClose={() => setCropFile(null)}
      />

      <Modal
        open={removeOpen}
        title="移除文章封面"
        onClose={() => setRemoveOpen(false)}
        footer={
          <>
            <Button onClick={() => setRemoveOpen(false)} variant="secondary">
              取消
            </Button>
            <Button
              disabled={disabled}
              onClick={() => {
                onChange({ kind: 'remove' })
                setRemoveOpen(false)
              }}
              variant="danger"
            >
              确认移除
            </Button>
          </>
        }
      >
        <div className="article-cover-remove-dialog">
          <ArticleCover coverUrl={currentCover} alt={title} />
        </div>
      </Modal>
    </FormField>
  )
}
