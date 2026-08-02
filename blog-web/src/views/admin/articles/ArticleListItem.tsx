import { Pencil, Pin, Star } from 'lucide-react'

import { Button } from '@/components/ui'
import type { ArticleVO } from '@/types/article'

import { ArticleCover } from './ArticleCover'
import { ArticleListActions } from './ArticleListActions'
import { ArticleStatusBadge } from './ArticleStatusBadge'

type ArticleListItemProps = {
  article: ArticleVO
  onEdit: (id: number) => void
  onDelete: (article: ArticleVO) => void
  onError: (message: string) => void
  batchMode?: boolean
  selected?: boolean
  onSelect?: (article: ArticleVO, selected: boolean) => void
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-CN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

export const ArticleListItem = ({
  article,
  onEdit,
  onDelete,
  onError,
  batchMode,
  selected,
  onSelect,
}: ArticleListItemProps) => (
  <article
    className={`article-list-item ${batchMode ? 'article-list-item--batch' : ''}`}
  >
    {batchMode ? (
      <label className="article-list-item__checkbox">
        <input
          checked={selected}
          type="checkbox"
          onChange={(event) => onSelect?.(article, event.target.checked)}
        />
        <span className="sr-only">选择 {article.title}</span>
      </label>
    ) : null}
    <ArticleCover coverUrl={article.coverUrl} alt="" />
    <div className="article-list-item__body">
      <div className="article-list-item__heading">
        <h2>{article.title}</h2>
        <ArticleStatusBadge status={article.status} />
        {article.isTop ? (
          <span className="article-feature-flag">
            <Pin />
            置顶
          </span>
        ) : null}
        {article.isRecommend ? (
          <span className="article-feature-flag">
            <Star />
            推荐
          </span>
        ) : null}
      </div>
      <p className="article-list-item__summary">
        {article.summary?.trim() || '暂无摘要'}
      </p>
      <div className="article-list-item__meta">
        <span>分类 {article.categoryName || '未分类'}</span>
        <span>阅读 {article.viewCount}</span>
        <span>评论 {article.commentCount}</span>
        <span>发布 {formatDateTime(article.publishedAt) ?? '尚未发布'}</span>
        <span>更新 {formatDateTime(article.updatedAt)}</span>
      </div>
    </div>
    <div className="article-list-item__actions">
      <Button
        aria-label={`编辑 ${article.title}`}
        icon={<Pencil />}
        onClick={() => onEdit(article.id)}
        size="sm"
        variant="secondary"
      >
        编辑
      </Button>
      {!batchMode ? (
        <>
          <ArticleListActions
            article={article}
            onDelete={onDelete}
            onError={onError}
          />
          <button
            aria-label={`删除 ${article.title}`}
            className="article-list-item__legacy-delete"
            onClick={() => onDelete(article)}
            tabIndex={-1}
            type="button"
          />
        </>
      ) : null}
    </div>
  </article>
)
