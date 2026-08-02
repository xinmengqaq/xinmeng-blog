import {
  FileImage,
  Monitor,
  RotateCcw,
  RotateCw,
  Smartphone,
  ZoomIn,
} from 'lucide-react'

import { Button } from '@/components/ui'

import type { ImageUploadTarget } from './ImageCropDialog'

type CropSidebarProps = {
  target: ImageUploadTarget
  aspect: number
  zoom: number
  rotation: number
  contentAspect: number
  previewSource: string | null
  error: string | null
  onZoomChange: (zoom: number) => void
  onRotationChange: (rotation: number) => void
  onContentAspectChange: (aspect: number) => void
  onReset: () => void
}

const MIN_CONTENT_ASPECT = 0.25
const MAX_CONTENT_ASPECT = 4

export const CropSidebar = ({
  target,
  aspect,
  zoom,
  rotation,
  contentAspect,
  previewSource,
  error,
  onZoomChange,
  onRotationChange,
  onContentAspectChange,
  onReset,
}: CropSidebarProps) => (
  <aside className="image-crop-dialog__sidebar" aria-label="裁剪设置和预览">
    <div className="image-crop-dialog__controls">
      <label className="image-crop-dialog__control">
        <span>
          <ZoomIn aria-hidden="true" /> 缩放
          <output>{Math.round(zoom * 100)}%</output>
        </span>
        <input
          aria-label="缩放"
          max="3"
          min="1"
          onChange={(event) => onZoomChange(Number(event.target.value))}
          step="0.01"
          type="range"
          value={zoom}
        />
      </label>
      <label className="image-crop-dialog__control">
        <span>
          <RotateCw aria-hidden="true" /> 旋转
          <output>{rotation}°</output>
        </span>
        <input
          aria-label="旋转"
          max="180"
          min="-180"
          onChange={(event) => onRotationChange(Number(event.target.value))}
          step="1"
          type="range"
          value={rotation}
        />
      </label>
      {target === 'content' ? (
        <label className="image-crop-dialog__control">
          <span>
            <FileImage aria-hidden="true" /> 自由比例
            <output>{contentAspect.toFixed(2)}:1</output>
          </span>
          <input
            aria-label="正文图片比例"
            max={MAX_CONTENT_ASPECT}
            min={MIN_CONTENT_ASPECT}
            onChange={(event) =>
              onContentAspectChange(Number(event.target.value))
            }
            step="0.01"
            type="range"
            value={contentAspect}
          />
        </label>
      ) : null}
      <Button icon={<RotateCcw />} onClick={onReset} variant="secondary">
        重置
      </Button>
    </div>
    <div className="image-crop-dialog__preview-section">
      <span className="image-crop-dialog__preview-title">裁剪预览</span>
      {target === 'background' ? (
        <div className="image-crop-dialog__background-previews">
          <div>
            <span>
              <Monitor aria-hidden="true" /> 桌面
            </span>
            <div className="image-crop-dialog__preview image-crop-dialog__preview--background-desktop">
              {previewSource ? (
                <img src={previewSource} alt="背景桌面预览" />
              ) : null}
            </div>
          </div>
          <div>
            <span>
              <Smartphone aria-hidden="true" /> 移动
            </span>
            <div className="image-crop-dialog__preview image-crop-dialog__preview--background-mobile">
              {previewSource ? (
                <img src={previewSource} alt="背景移动预览" />
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`image-crop-dialog__preview image-crop-dialog__preview--${target}`}
          style={{ aspectRatio: aspect }}
        >
          {previewSource ? (
            <img src={previewSource} alt="裁剪结果预览" />
          ) : null}
          {target === 'cover' ? (
            <span className="image-crop-dialog__safe-area" aria-hidden="true" />
          ) : null}
        </div>
      )}
      {error ? <p className="image-crop-dialog__error">{error}</p> : null}
    </div>
  </aside>
)
