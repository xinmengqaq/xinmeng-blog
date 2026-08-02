import {
  Image as ImageIcon,
  LoaderCircle,
  Monitor,
  Smartphone,
} from 'lucide-react'
import { useEffect, useState } from 'react'

type BackgroundFrameProps = {
  alt: string
  className: string
  emptyLabel: string
  isLoading?: boolean
  showEmptyLabel?: boolean
  source: string
}

const BackgroundFrame = ({
  alt,
  className,
  emptyLabel,
  isLoading = false,
  showEmptyLabel = true,
  source,
}: BackgroundFrameProps) => {
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => setLoadFailed(false), [source])

  return (
    <div
      aria-busy={isLoading || undefined}
      className={`${className}${source && !loadFailed ? '' : ' is-empty'}`}
    >
      {source && !loadFailed ? (
        <img alt={alt} src={source} onError={() => setLoadFailed(true)} />
      ) : (
        <span
          className={
            showEmptyLabel
              ? 'site-background-placeholder'
              : 'site-background-placeholder site-background-placeholder--icon-only'
          }
        >
          {isLoading ? (
            <LoaderCircle aria-hidden="true" className="is-loading" />
          ) : (
            <ImageIcon aria-hidden="true" />
          )}
          <span
            className={showEmptyLabel ? undefined : 'admin-visually-hidden'}
          >
            {emptyLabel}
          </span>
        </span>
      )}
    </div>
  )
}

type SiteBackgroundPreviewProps = {
  isLoading: boolean
  source: string
}

export const SiteBackgroundPreview = ({
  isLoading,
  source,
}: SiteBackgroundPreviewProps) => {
  const emptyLabel = isLoading && !source ? '正在读取当前背景' : '暂无站点背景'
  const unavailableLabel = source ? '当前背景无法预览' : emptyLabel

  return (
    <div className="site-background-preview-grid">
      <div className="site-background-preview-group">
        <div className="site-background-preview-group__heading">
          <span className="site-background-preview-group__label">
            <Monitor aria-hidden="true" /> 桌面预览
          </span>
          <span className="site-background-preview-group__ratio">12:5</span>
        </div>
        <BackgroundFrame
          alt="站点背景桌面预览"
          className="site-background-preview site-background-preview--desktop"
          emptyLabel={unavailableLabel}
          isLoading={isLoading && !source}
          source={source}
        />
      </div>
      <div className="site-background-preview-group">
        <div className="site-background-preview-group__heading">
          <span className="site-background-preview-group__label">
            <Smartphone aria-hidden="true" /> 移动预览
          </span>
          <span className="site-background-preview-group__ratio">12:5</span>
        </div>
        <BackgroundFrame
          alt="站点背景移动预览"
          className="site-background-preview site-background-preview--mobile"
          emptyLabel={unavailableLabel}
          isLoading={isLoading && !source}
          showEmptyLabel={false}
          source={source}
        />
      </div>
    </div>
  )
}

type SiteBackgroundThumbnailProps = {
  source: string
}

export const SiteBackgroundThumbnail = ({
  source,
}: SiteBackgroundThumbnailProps) => (
  <BackgroundFrame
    alt="将移除的站点背景"
    className="site-background-thumbnail"
    emptyLabel="暂无站点背景"
    source={source}
  />
)
