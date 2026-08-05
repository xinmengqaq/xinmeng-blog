import { useState, type ImgHTMLAttributes } from 'react'

type Props = {
  src?: string | null
  alt: string
  className?: string
  loading?: ImgHTMLAttributes<HTMLImageElement>['loading']
  decoding?: ImgHTMLAttributes<HTMLImageElement>['decoding']
  fetchPriority?: ImgHTMLAttributes<HTMLImageElement>['fetchPriority']
  onReady?: (result: 'loaded' | 'failed') => void
}

export const FrontArticleImage = ({
  src,
  alt,
  className = '',
  loading,
  decoding,
  fetchPriority,
  onReady,
}: Props) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = src != null && failedSrc === src

  if (!src || failed) {
    const placeholderLabel = alt ? `${alt}图片占位` : undefined

    return (
      <div
        className={`front-image front-image--placeholder ${className}`}
        role={placeholderLabel ? 'img' : undefined}
        aria-label={placeholderLabel}
      />
    )
  }
  return (
    <img
      className={`front-image ${className}`}
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      onLoad={() => onReady?.('loaded')}
      onError={() => {
        setFailedSrc(src)
        onReady?.('failed')
      }}
    />
  )
}
