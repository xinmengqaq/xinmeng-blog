import { FrontIcon } from '@/components/front/visual'

type Props = {
  publishedAt?: string | null
  categoryName?: string | null
  viewCount?: number | null
  likeCount?: number | null
  showCategory?: boolean
}

const date = (value?: string | null) => {
  if (!value) return '未发布'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? '未发布'
    : parsed.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
}

export const FrontArticleMeta = ({
  publishedAt,
  categoryName,
  viewCount,
  likeCount,
  showCategory = true,
}: Props) => (
  <div className="front-meta">
    {showCategory && categoryName ? (
      <span>
        <FrontIcon name="category" size={16} />
        {categoryName}
      </span>
    ) : null}
    <span>
      <FrontIcon name="date" size={16} />
      {date(publishedAt)}
    </span>
    {viewCount != null ? (
      <span>
        <FrontIcon name="views" size={16} />
        {viewCount.toLocaleString()}
      </span>
    ) : null}
    {likeCount != null ? (
      <span>
        <FrontIcon name="like" size={16} />
        {likeCount.toLocaleString()}
      </span>
    ) : null}
  </div>
)
