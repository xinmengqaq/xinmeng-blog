import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'

type ArticleCoverProps = {
  coverUrl?: string | null
  alt?: string
}

export const ArticleCover = ({ coverUrl, alt = '' }: ArticleCoverProps) => {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [coverUrl])

  if (!coverUrl || failed) {
    return (
      <div
        className="article-cover article-cover--placeholder"
        aria-label="暂无封面"
      >
        <FileText aria-hidden="true" />
        <span>暂无封面</span>
      </div>
    )
  }

  return (
    <div className="article-cover">
      <img src={coverUrl} alt={alt} onError={() => setFailed(true)} />
    </div>
  )
}
