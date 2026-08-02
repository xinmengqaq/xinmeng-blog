import { useEffect, useState } from 'react'

type Props = { src?: string | null; alt: string; className?: string }

export const FrontArticleImage = ({ src, alt, className = '' }: Props) => {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
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
      onError={() => setFailed(true)}
    />
  )
}
