import type { ArticleStatus } from '@/types/article'

const articleStatusLabels: Record<ArticleStatus, string> = {
  draft: '草稿',
  published: '已发布',
  hidden: '隐藏',
}

type ArticleStatusBadgeProps = {
  status: ArticleStatus
}

export const ArticleStatusBadge = ({ status }: ArticleStatusBadgeProps) => (
  <span className={`article-status-badge article-status-badge--${status}`}>
    {articleStatusLabels[status]}
  </span>
)
