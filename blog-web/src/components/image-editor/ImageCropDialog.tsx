import { Check } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area, type MediaSize, type Point } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'

import { Button, Modal } from '@/components/ui'
import type { ImageDraft } from '@/types/file'
import { createImageDraft } from '@/utils/imageDrafts'

import { createCroppedImageBlob } from './cropImage'
import {
  clamp,
  CROP_TARGETS,
  DEFAULT_CONTENT_ASPECT,
  formatFileSize,
  getOutputType,
  MAX_CONTENT_ASPECT,
  MIN_CONTENT_ASPECT,
  type ImageUploadTarget,
} from './cropConfig'
import { CropCloseConfirm } from './CropCloseConfirm'
import { CropSidebar } from './CropSidebar'
import './imageCropDialog.css'

export type { ImageUploadTarget } from './cropConfig'

type ImageCropDialogProps = {
  open: boolean
  file: File | null
  target: ImageUploadTarget
  onClose: () => void
  onApply: (draft: ImageDraft) => void
}

const INITIAL_CROP: Point = { x: 0, y: 0 }

export const ImageCropDialog = ({
  open,
  file,
  target,
  onClose,
  onApply,
}: ImageCropDialogProps) => {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>(INITIAL_CROP)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [contentAspect, setContentAspect] = useState(DEFAULT_CONTENT_ASPECT)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)
  const previewUrlRef = useRef<string | null>(null)
  const hasSetInitialContentAspect = useRef(false)

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    setPreviewUrl(null)
  }, [])

  const requestClose = useCallback(() => {
    if (!applying) {
      setConfirmingClose(true)
    }
  }, [applying])

  const replacePreview = useCallback(
    (blob: Blob) => {
      const nextUrl = URL.createObjectURL(blob)
      clearPreview()
      previewUrlRef.current = nextUrl
      setPreviewUrl(nextUrl)
    },
    [clearPreview],
  )

  useEffect(() => {
    if (!open || !file) {
      setSourceUrl(null)
      return
    }

    const nextUrl = URL.createObjectURL(file)
    setSourceUrl(nextUrl)

    return () => URL.revokeObjectURL(nextUrl)
  }, [file, open])

  useEffect(() => {
    clearPreview()
    hasSetInitialContentAspect.current = false
    setCrop(INITIAL_CROP)
    setZoom(1)
    setRotation(0)
    setContentAspect(DEFAULT_CONTENT_ASPECT)
    setCroppedArea(null)
    setError(null)
    setApplying(false)
    setConfirmingClose(false)
  }, [clearPreview, file, open, target])

  useEffect(() => clearPreview, [clearPreview])

  const isGif = file?.type === 'image/gif'
  const cropConfig = CROP_TARGETS[target]
  const aspect = target === 'content' ? contentAspect : cropConfig.aspect

  useEffect(() => {
    if (!open || !sourceUrl || isGif || !croppedArea || !file) {
      return
    }

    let cancelled = false

    void createCroppedImageBlob(
      sourceUrl,
      croppedArea,
      rotation,
      getOutputType(file.type),
    )
      .then((blob) => {
        if (!cancelled) {
          replacePreview(blob)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('预览生成失败，请调整后重试')
        }
      })

    return () => {
      cancelled = true
    }
  }, [croppedArea, file, isGif, open, replacePreview, rotation, sourceUrl])

  const resetCrop = () => {
    setCrop(INITIAL_CROP)
    setZoom(1)
    setRotation(0)
    setContentAspect(DEFAULT_CONTENT_ASPECT)
    setError(null)
  }

  const handleMediaLoaded = (mediaSize: MediaSize) => {
    if (target !== 'content' || hasSetInitialContentAspect.current) {
      return
    }

    hasSetInitialContentAspect.current = true
    setContentAspect(
      clamp(
        mediaSize.naturalWidth / mediaSize.naturalHeight,
        MIN_CONTENT_ASPECT,
        MAX_CONTENT_ASPECT,
      ),
    )
  }

  const applyStaticCrop = async () => {
    if (!file || !sourceUrl || !croppedArea) {
      setError('图片尚未准备完成，请稍后重试')
      return
    }

    setApplying(true)
    setError(null)

    try {
      const croppedBlob = await createCroppedImageBlob(
        sourceUrl,
        croppedArea,
        rotation,
        getOutputType(file.type),
      )
      onApply(createImageDraft(file, croppedBlob))
      onClose()
    } catch {
      setError('裁剪图片生成失败，请调整后重试')
    } finally {
      setApplying(false)
    }
  }

  const confirmGif = () => {
    if (!file) {
      return
    }

    onApply(createImageDraft(file))
    onClose()
  }

  if (!open || !file) {
    return null
  }

  const previewSource = previewUrl ?? sourceUrl

  if (confirmingClose) {
    return (
      <CropCloseConfirm
        onContinue={() => setConfirmingClose(false)}
        onDiscard={onClose}
      />
    )
  }

  if (isGif) {
    return (
      <Modal
        locked={applying}
        open
        title="确认正文 GIF"
        onClose={requestClose}
        panelClassName="image-crop-modal"
        footer={
          <>
            <Button onClick={requestClose} variant="secondary">
              取消
            </Button>
            <Button icon={<Check />} onClick={confirmGif}>
              确认 GIF
            </Button>
          </>
        }
      >
        <div className="image-crop-dialog image-crop-dialog--gif">
          <div className="image-crop-dialog__gif-preview">
            {sourceUrl ? <img src={sourceUrl} alt="待确认的 GIF 动画" /> : null}
          </div>
          <dl className="image-crop-dialog__file-info">
            <div>
              <dt>文件名</dt>
              <dd title={file.name}>{file.name}</dd>
            </div>
            <div>
              <dt>格式</dt>
              <dd>{file.type || 'image/gif'}</dd>
            </div>
            <div>
              <dt>大小</dt>
              <dd>{formatFileSize(file.size)}</dd>
            </div>
          </dl>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      locked={applying}
      open
      title={cropConfig.title}
      onClose={requestClose}
      panelClassName="image-crop-modal"
      footer={
        <>
          <Button
            disabled={applying}
            onClick={requestClose}
            variant="secondary"
          >
            取消
          </Button>
          <Button
            icon={<Check />}
            loading={applying}
            onClick={() => void applyStaticCrop()}
          >
            应用裁剪
          </Button>
        </>
      }
    >
      <div className="image-crop-dialog">
        <div className="image-crop-dialog__workspace">
          <div className="image-crop-dialog__canvas" aria-label="图片裁剪区域">
            {sourceUrl ? (
              <Cropper
                aspect={aspect}
                crop={crop}
                cropShape={cropConfig.cropShape}
                disableAutomaticStylesInjection
                image={sourceUrl}
                maxZoom={3}
                minZoom={1}
                onCropChange={setCrop}
                onCropComplete={(_, pixels) => setCroppedArea(pixels)}
                onMediaLoaded={handleMediaLoaded}
                onRotationChange={setRotation}
                onZoomChange={setZoom}
                rotation={rotation}
                showGrid={false}
                zoom={zoom}
              />
            ) : null}
          </div>
          <CropSidebar
            aspect={aspect}
            contentAspect={contentAspect}
            error={error}
            onContentAspectChange={setContentAspect}
            onReset={resetCrop}
            onRotationChange={setRotation}
            onZoomChange={setZoom}
            previewSource={previewSource}
            rotation={rotation}
            target={target}
            zoom={zoom}
          />
        </div>
      </div>
    </Modal>
  )
}
