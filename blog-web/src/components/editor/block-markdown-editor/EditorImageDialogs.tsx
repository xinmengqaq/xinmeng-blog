import { ImageOff } from 'lucide-react'

import { ImageCropDialog } from '@/components/image-editor'
import { Alert, Button, Modal } from '@/components/ui'

import type { EditorImageUpload } from './hooks/useEditorImageUpload'

type EditorImageDialogsProps = {
  disabled: boolean
  imageUpload: EditorImageUpload
}

export const EditorImageDialogs = ({
  disabled,
  imageUpload,
}: EditorImageDialogsProps) => {
  const removeBlock = imageUpload.removeBlock
  return (
    <>
      <input
        ref={imageUpload.fileInputRef}
        accept={imageUpload.accept}
        aria-hidden="true"
        className="admin-visually-hidden"
        disabled={disabled}
        onChange={imageUpload.selectFile}
        tabIndex={-1}
        type="file"
      />
      {imageUpload.error ? (
        <div className="block-editor__image-feedback">
          <Alert type="error">{imageUpload.error}</Alert>
        </div>
      ) : null}
      <ImageCropDialog
        file={imageUpload.cropFile}
        open={Boolean(imageUpload.cropFile)}
        target="content"
        onApply={imageUpload.applyDraft}
        onClose={imageUpload.closeCrop}
      />
      <Modal
        open={Boolean(removeBlock)}
        title="移除正文图片"
        onClose={() => imageUpload.setRemoveBlock(null)}
        footer={
          <>
            <Button
              onClick={() => imageUpload.setRemoveBlock(null)}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              disabled={disabled}
              onClick={imageUpload.confirmRemove}
              variant="danger"
            >
              移除图片
            </Button>
          </>
        }
      >
        <div className="block-editor__image-remove-dialog">
          {removeBlock?.url ? (
            <img src={removeBlock.url} alt={removeBlock.alt ?? ''} />
          ) : (
            <div className="block-editor__image-placeholder">
              <ImageOff aria-hidden="true" />
              <span>图片不可预览</span>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
