import { type ChangeEvent, useRef, useState } from 'react'

import type { ImageDraft } from '@/types/file'

import type { ImageBlock } from '../types'
import type { BlockEditorModel } from './useBlockEditorModel'

const CONTENT_FILE_ACCEPT =
  '.jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif'
const CONTENT_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const CONTENT_FILE_EXTENSION = /\.(jpe?g|png|webp|gif)$/i

type PendingImageAction =
  { kind: 'insert'; afterId?: string } | { kind: 'replace'; blockId: string }

type EditorImageUploadOptions = {
  model: BlockEditorModel
  imageDrafts: ReadonlyMap<string, ImageDraft>
  onDraftCreate?: (draft: ImageDraft) => void
  onDraftRelease?: (previewUrl: string) => void
}

const getContentFileError = (file: File): string | null => {
  if (file.size === 0) return '图片文件不能为空，请重新选择'
  if (
    (file.type && !CONTENT_FILE_TYPES.has(file.type)) ||
    (!file.type && !CONTENT_FILE_EXTENSION.test(file.name))
  ) {
    return '请选择 JPG、JPEG、PNG、WebP 或 GIF 格式的图片'
  }
  return null
}

const readSelectedContentFile = (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0] ?? null
  event.target.value = ''
  return { file, error: file ? getContentFileError(file) : null }
}

const applyImageDraft = (
  action: PendingImageAction,
  draft: ImageDraft,
  model: BlockEditorModel,
): string | null | undefined => {
  if (action.kind === 'insert') {
    model.insertImageBlock(draft.previewUrl, '', action.afterId)
    return null
  }
  const block = model.blocksRef.current.find(
    (item): item is ImageBlock =>
      item.id === action.blockId && item.type === 'image',
  )
  if (!block) return undefined
  model.replaceBlock({ ...block, url: draft.previewUrl })
  return block.url
}

const loadStaticImageFile = async (url: string): Promise<File> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('image unavailable')
  const blob = await response.blob()
  if (!blob.type.startsWith('image/') || blob.type === 'image/gif') {
    throw new Error('unsupported image')
  }
  return new File([blob], 'content-image', { type: blob.type })
}

const getRecropFile = (
  block: ImageBlock,
  imageDrafts: ReadonlyMap<string, ImageDraft>,
) => {
  const draft = imageDrafts.get(block.url)
  return draft?.type === 'static'
    ? Promise.resolve(draft.originalFile)
    : loadStaticImageFile(block.url)
}

const removeImageBlock = (block: ImageBlock, model: BlockEditorModel) => {
  model.deleteToolbarBlock(block.id)
}

export const useEditorImageUpload = ({
  model,
  imageDrafts,
  onDraftCreate,
}: EditorImageUploadOptions) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingImageAction | null>(
    null,
  )
  const [removeBlock, setRemoveBlock] = useState<ImageBlock | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preparingCrop, setPreparingCrop] = useState(false)

  const openPicker = (action: PendingImageAction) => {
    setError(null)
    setPendingAction(action)
    fileInputRef.current?.click()
  }

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const { file, error: nextError } = readSelectedContentFile(event)
    if (!file) return
    if (nextError) {
      setError(nextError)
      setPendingAction(null)
      return
    }
    setCropFile(file)
  }

  const applyDraft = (draft: ImageDraft) => {
    const action = pendingAction
    if (!action) return
    const replacedUrl = applyImageDraft(action, draft, model)
    if (replacedUrl === undefined) return
    onDraftCreate?.(draft)
    setError(null)
  }

  const closeCrop = () => {
    setCropFile(null)
    setPendingAction(null)
  }

  const recrop = async (block: ImageBlock) => {
    setPreparingCrop(true)
    setError(null)
    try {
      setPendingAction({ kind: 'replace', blockId: block.id })
      setCropFile(await getRecropFile(block, imageDrafts))
    } catch {
      setError('当前图片无法重新裁剪，请改用更换图片')
    } finally {
      setPreparingCrop(false)
    }
  }

  const confirmRemove = () => {
    if (!removeBlock) return
    removeImageBlock(removeBlock, model)
    setRemoveBlock(null)
  }

  return {
    accept: CONTENT_FILE_ACCEPT,
    cropFile,
    error,
    fileInputRef,
    preparingCrop,
    removeBlock,
    applyDraft,
    closeCrop,
    confirmRemove,
    openInsert: (afterId?: string) => openPicker({ kind: 'insert', afterId }),
    openReplace: (blockId: string) => openPicker({ kind: 'replace', blockId }),
    recrop,
    selectFile,
    setError,
    setRemoveBlock,
    getDraft: (url: string) => imageDrafts.get(url),
  }
}

export type EditorImageUpload = ReturnType<typeof useEditorImageUpload>
