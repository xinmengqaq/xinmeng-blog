import { PencilLine, Trash2, Upload } from 'lucide-react'
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  type BlockerFunction,
  useBeforeUnload,
  useBlocker,
} from 'react-router-dom'

import { AdminAvatar } from '@/components/admin'
import {
  ImageCropDialog,
  ImageEditorToolbar,
} from '@/components/admin/image-upload'
import { Alert, Button, ConfirmDialog, FormField, Modal } from '@/components/ui'
import type { AdminAvatarChange, ImageDraft } from '@/types/file'

const AVATAR_FILE_ACCEPT =
  '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const AVATAR_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const AVATAR_FILE_EXTENSION = /\.(jpe?g|png|webp)$/i

type AdminAvatarEditorProps = {
  avatarChange: AdminAvatarChange | null
  currentAvatar: string
  disabled: boolean
  onAvatarChange: (change: AdminAvatarChange | null) => void
}

const getAvatarFileError = (file: File): string | null => {
  if (file.size === 0) {
    return '头像文件不能为空，请重新选择图片'
  }

  if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
    return '管理员头像不支持 GIF，请选择 JPG、PNG 或 WebP 图片'
  }

  const hasAcceptedMimeType = AVATAR_FILE_TYPES.has(file.type)
  const hasAcceptedExtension = AVATAR_FILE_EXTENSION.test(file.name)

  if (
    (file.type && !hasAcceptedMimeType) ||
    (!file.type && !hasAcceptedExtension)
  ) {
    return '请选择 JPG、JPEG、PNG 或 WebP 格式的图片'
  }

  return null
}

export const AdminAvatarEditor = ({
  avatarChange,
  currentAvatar,
  disabled,
  onAvatarChange,
}: AdminAvatarEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)

  const draft = avatarChange?.kind === 'upload' ? avatarChange.draft : null
  const removePending = avatarChange?.kind === 'remove'
  const hasCurrentAvatar = Boolean(currentAvatar.trim())
  const hasPendingChanges = Boolean(draft) || removePending
  const previewSrc = removePending ? null : (draft?.previewUrl ?? currentAvatar)
  const statusLabel = removePending
    ? '头像将在保存资料时移除'
    : draft
      ? '新头像待保存'
      : hasCurrentAvatar
        ? '当前头像'
        : '默认头像'

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      hasPendingChanges && currentLocation.pathname !== nextLocation.pathname,
    [hasPendingChanges],
  )
  const blocker = useBlocker(shouldBlock)

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!hasPendingChanges) {
          return
        }

        event.preventDefault()
        event.returnValue = ''
      },
      [hasPendingChanges],
    ),
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setLeaveDialogOpen(true)
    }
  }, [blocker.state])

  const discardChanges = () => {
    onAvatarChange(null)
    setFileError(null)
  }

  const handlePickAvatar = () => {
    setFileError(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const error = getAvatarFileError(file)

    if (error) {
      setFileError(error)
      return
    }

    setFileError(null)
    setCropFile(file)
  }

  const handleCropApply = (nextDraft: ImageDraft) => {
    onAvatarChange({ kind: 'upload', draft: nextDraft })
    setFileError(null)
  }

  const handleRemoveConfirm = () => {
    onAvatarChange({ kind: 'remove' })
    setFileError(null)
    setRemoveDialogOpen(false)
  }

  const handleLeaveCancel = () => {
    setLeaveDialogOpen(false)

    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }

  const handleLeaveConfirm = () => {
    discardChanges()
    setLeaveDialogOpen(false)

    if (blocker.state === 'blocked') {
      blocker.proceed()
    }
  }

  const uploadLabel = removePending
    ? '上传头像'
    : hasCurrentAvatar || draft
      ? '更换头像'
      : '上传头像'
  const uploadIcon =
    removePending || (!hasCurrentAvatar && !draft) ? <Upload /> : <PencilLine />
  const toolbarState = removePending
    ? 'remove'
    : draft
      ? 'upload'
      : hasCurrentAvatar
        ? 'current'
        : 'empty'

  return (
    <div className="admin-avatar-editor">
      <FormField label="头像图片">
        <div className="admin-avatar-editor__body">
          <AdminAvatar label="头像预览" size="lg" src={previewSrc} />
          <div className="admin-avatar-editor__details">
            <ImageEditorToolbar
              disabled={disabled}
              onUndo={hasPendingChanges ? discardChanges : undefined}
              state={toolbarState}
              status={statusLabel}
              undoLabel="撤销头像变更"
              undoTitle="撤销头像变更"
            >
              <Button
                disabled={disabled}
                icon={uploadIcon}
                onClick={handlePickAvatar}
                size="sm"
                variant={
                  hasCurrentAvatar && !removePending ? 'secondary' : 'primary'
                }
              >
                {uploadLabel}
              </Button>
              {hasCurrentAvatar && !removePending ? (
                <Button
                  aria-label="移除头像"
                  className="image-editor-toolbar__icon-action"
                  disabled={disabled}
                  icon={<Trash2 />}
                  onClick={() => setRemoveDialogOpen(true)}
                  size="sm"
                  title="移除头像"
                  variant="ghost"
                />
              ) : null}
            </ImageEditorToolbar>
          </div>
        </div>
      </FormField>
      <input
        ref={fileInputRef}
        accept={AVATAR_FILE_ACCEPT}
        aria-hidden="true"
        className="admin-visually-hidden"
        onChange={handleFileChange}
        tabIndex={-1}
        type="file"
      />
      {fileError ? <Alert type="error">{fileError}</Alert> : null}

      <ImageCropDialog
        file={cropFile}
        open={Boolean(cropFile)}
        target="avatar"
        onApply={handleCropApply}
        onClose={() => setCropFile(null)}
      />

      <Modal
        open={removeDialogOpen}
        title="移除管理员头像"
        onClose={() => setRemoveDialogOpen(false)}
        footer={
          <>
            <Button
              onClick={() => setRemoveDialogOpen(false)}
              variant="secondary"
            >
              取消
            </Button>
            <Button onClick={handleRemoveConfirm} variant="danger">
              确认移除
            </Button>
          </>
        }
      >
        <div className="admin-avatar-removal-dialog">
          <AdminAvatar label="将移除的头像预览" size="md" src={currentAvatar} />
        </div>
      </Modal>

      <ConfirmDialog
        cancelText="继续编辑"
        confirmText="放弃变更"
        description="当前头像变更尚未保存。放弃后会恢复当前头像，且不会发送任何请求。"
        open={leaveDialogOpen}
        title="放弃头像变更"
        onCancel={handleLeaveCancel}
        onConfirm={handleLeaveConfirm}
      />
    </div>
  )
}
