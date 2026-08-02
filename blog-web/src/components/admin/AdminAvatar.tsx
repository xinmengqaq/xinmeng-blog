import { useEffect, useState } from 'react'

import './admin.css'

type AdminAvatarProps = {
  src?: string | null
  label: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
}

export const AdminAvatar = ({
  src,
  label,
  alt = '',
  size = 'md',
}: AdminAvatarProps) => {
  const avatarSrc = src?.trim() ?? ''
  const [loadFailed, setLoadFailed] = useState(false)
  const showImage = Boolean(avatarSrc) && !loadFailed

  useEffect(() => {
    setLoadFailed(false)
  }, [avatarSrc])

  return (
    <span
      aria-label={label}
      className={`admin-avatar admin-avatar--${size}`}
      role="img"
    >
      {showImage ? (
        <img alt={alt} src={avatarSrc} onError={() => setLoadFailed(true)} />
      ) : null}
    </span>
  )
}
