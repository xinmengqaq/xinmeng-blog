import { PencilLine, Save, Trash2, Upload } from 'lucide-react'
import { type RefObject, useRef, useState } from 'react'

import { ImageCropDialog, ImageEditorToolbar } from '@/components/image-editor'
import {
  Alert,
  Button,
  ConfirmDialog,
  DataSection,
  Modal,
} from '@/components/ui'
import { useSaveSiteBackgroundMutation } from '@/queries/siteConfig'
import type { SiteBackgroundChange } from '@/types/file'
import { toApiError } from '@/utils/request'

import {
  SiteBackgroundPreview,
  SiteBackgroundThumbnail,
} from './SiteBackgroundPreview'
import {
  type SiteBackgroundDraft,
  useSiteBackgroundDraft,
} from './useSiteBackgroundDraft'
import './siteSettings.css'

const BACKGROUND_FILE_ACCEPT =
  '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

type SiteBackgroundEditorProps = {
  currentBackground: string
  isLoading: boolean
}

const getStatusLabel = (
  change: SiteBackgroundChange | null,
  hasCurrentBackground: boolean,
  isSaving: boolean,
) => {
  if (isSaving) {
    return '正在保存背景'
  }

  if (change?.kind === 'remove') {
    return '背景将在保存站点设置时移除'
  }

  if (change?.kind === 'upload') {
    return '新背景待保存'
  }

  return hasCurrentBackground ? '当前背景' : '暂无背景'
}

type SiteBackgroundActionsProps = {
  change: SiteBackgroundChange | null
  hasCurrentBackground: boolean
  hasPendingChanges: boolean
  isSaving: boolean
  onPick: () => void
  onRemove: () => void
  onSave: () => void
}

const SiteBackgroundActions = ({
  change,
  hasCurrentBackground,
  hasPendingChanges,
  isSaving,
  onPick,
  onRemove,
  onSave,
}: SiteBackgroundActionsProps) => {
  const isRemovalPending = change?.kind === 'remove'
  const isReplacement = hasCurrentBackground || change?.kind === 'upload'

  return (
    <>
      <Button
        icon={isReplacement && !isRemovalPending ? <PencilLine /> : <Upload />}
        disabled={isSaving}
        onClick={onPick}
        size="sm"
        variant={isReplacement && !isRemovalPending ? 'secondary' : 'primary'}
      >
        {isReplacement && !isRemovalPending ? '更换背景' : '上传背景'}
      </Button>
      {hasCurrentBackground && !isRemovalPending ? (
        <Button
          aria-label="移除背景"
          className="image-editor-toolbar__icon-action"
          icon={<Trash2 />}
          disabled={isSaving}
          onClick={onRemove}
          size="sm"
          title="移除背景"
          variant="ghost"
        />
      ) : null}
      {hasPendingChanges ? (
        <span className="image-editor-toolbar__submit">
          <Button icon={<Save />} loading={isSaving} onClick={onSave} size="sm">
            保存站点设置
          </Button>
        </span>
      ) : null}
    </>
  )
}

type SiteBackgroundDialogsProps = {
  currentBackground: string
  draft: SiteBackgroundDraft
  fileInputRef: RefObject<HTMLInputElement | null>
}

const SiteBackgroundDialogs = ({
  currentBackground,
  draft,
  fileInputRef,
}: SiteBackgroundDialogsProps) => (
  <>
    <input
      ref={fileInputRef}
      accept={BACKGROUND_FILE_ACCEPT}
      aria-hidden="true"
      className="admin-visually-hidden"
      onChange={draft.handleFileChange}
      tabIndex={-1}
      type="file"
    />

    <ImageCropDialog
      file={draft.cropFile}
      open={Boolean(draft.cropFile)}
      target="background"
      onApply={draft.applyCrop}
      onClose={draft.closeCropDialog}
    />

    <Modal
      open={draft.removeDialogOpen}
      title="移除站点背景"
      onClose={draft.closeRemoveDialog}
      footer={
        <>
          <Button onClick={draft.closeRemoveDialog} variant="secondary">
            取消
          </Button>
          <Button onClick={draft.confirmRemove} variant="danger">
            确认移除
          </Button>
        </>
      }
    >
      <SiteBackgroundThumbnail source={currentBackground} />
    </Modal>

    <ConfirmDialog
      cancelText="继续编辑"
      confirmText="放弃变更"
      description="当前背景变更尚未保存。放弃后会恢复当前背景，且不会发送任何请求。"
      open={draft.leaveDialogOpen}
      title="放弃站点背景变更"
      onCancel={draft.cancelLeave}
      onConfirm={draft.confirmLeave}
    />
  </>
)

export const SiteBackgroundEditor = ({
  currentBackground,
  isLoading,
}: SiteBackgroundEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draft = useSiteBackgroundDraft()
  const saveMutation = useSaveSiteBackgroundMutation()
  const [saveError, setSaveError] = useState<string | null>(null)
  const normalizedBackground = currentBackground.trim()
  const hasCurrentBackground = Boolean(normalizedBackground)
  const pendingUpload =
    draft.change?.kind === 'upload' ? draft.change.draft.previewUrl : ''
  const previewSource =
    draft.change?.kind === 'remove' ? '' : pendingUpload || normalizedBackground
  const statusLabel = getStatusLabel(
    draft.change,
    hasCurrentBackground,
    saveMutation.isPending,
  )
  const toolbarState = saveMutation.isPending
    ? 'saving'
    : draft.change?.kind === 'remove'
      ? 'remove'
      : draft.change?.kind === 'upload'
        ? 'upload'
        : hasCurrentBackground
          ? 'current'
          : 'empty'

  const handleSave = () => {
    if (!draft.change || saveMutation.isPending) {
      return
    }

    setSaveError(null)
    void saveMutation
      .mutateAsync(draft.change)
      .then(draft.discardChanges)
      .catch((error: unknown) => setSaveError(toApiError(error).message))
  }

  const handlePick = () => {
    setSaveError(null)
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    setSaveError(null)
    draft.openRemoveDialog()
  }

  const handleDiscard = () => {
    setSaveError(null)
    draft.discardChanges()
  }

  return (
    <>
      <DataSection title="站点背景">
        <div className="site-background-editor">
          <ImageEditorToolbar
            disabled={saveMutation.isPending}
            onUndo={draft.hasPendingChanges ? handleDiscard : undefined}
            state={toolbarState}
            status={statusLabel}
            undoTitle="撤销背景变更"
          >
            <SiteBackgroundActions
              change={draft.change}
              hasCurrentBackground={hasCurrentBackground}
              hasPendingChanges={draft.hasPendingChanges}
              isSaving={saveMutation.isPending}
              onPick={handlePick}
              onRemove={handleRemove}
              onSave={handleSave}
            />
          </ImageEditorToolbar>
          <SiteBackgroundPreview isLoading={isLoading} source={previewSource} />
          {draft.fileError || saveError ? (
            <Alert type="error">{draft.fileError ?? saveError}</Alert>
          ) : null}
        </div>
      </DataSection>

      <SiteBackgroundDialogs
        currentBackground={normalizedBackground}
        draft={draft}
        fileInputRef={fileInputRef}
      />
    </>
  )
}
