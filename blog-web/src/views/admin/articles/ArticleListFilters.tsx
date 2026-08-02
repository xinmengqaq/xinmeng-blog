import { ChevronDown, Search, X } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { Button, FormField, Input } from '@/components/ui'
import type { ArticleStatus } from '@/types/article'
import type { CategoryVO, TagVO } from '@/types/taxonomy'

type ArticleListFiltersProps = {
  keyword: string
  status: ArticleStatus | ''
  categoryId: number | null
  tagId: number | null
  categories: CategoryVO[]
  tags: TagVO[]
  loading: boolean
  error?: string
  onKeywordChange: (keyword: string) => void
  onStatusChange: (status: ArticleStatus | '') => void
  onCategoryChange: (categoryId: number | null) => void
  onTagChange: (tagId: number | null) => void
  onSearch: () => void
  onReset: () => void
}

export const ArticleListFilters = ({
  keyword,
  status,
  categoryId,
  tagId,
  categories,
  tags,
  loading,
  error,
  onKeywordChange,
  onStatusChange,
  onCategoryChange,
  onTagChange,
  onSearch,
  onReset,
}: ArticleListFiltersProps) => {
  const [expanded, setExpanded] = useState(Boolean(categoryId || tagId))
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch()
  }

  return (
    <form className="article-filters" onSubmit={handleSubmit}>
      <FormField label="关键词" htmlFor="article-keyword" error={error}>
        <Input
          id="article-keyword"
          error={Boolean(error)}
          maxLength={51}
          placeholder="搜索标题或摘要"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </FormField>
      <FormField label="状态" htmlFor="article-status-filter">
        <select
          id="article-status-filter"
          className="article-select"
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as ArticleStatus | '')
          }
        >
          <option value="">全部</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="hidden">隐藏</option>
        </select>
      </FormField>
      <div className="article-filters__actions">
        <Button icon={<Search />} loading={loading} type="submit">
          查询
        </Button>
        <Button icon={<X />} onClick={onReset} variant="secondary">
          重置
        </Button>
        <Button
          aria-expanded={expanded}
          icon={<ChevronDown />}
          iconPosition="right"
          onClick={() => setExpanded((current) => !current)}
          variant="ghost"
        >
          更多筛选
        </Button>
      </div>
      <div
        className={`article-filters__advanced ${expanded ? 'article-filters__advanced--expanded' : ''}`}
      >
        <div>
          <FormField label="文章分类" htmlFor="article-category-filter">
            <select
              id="article-category-filter"
              className="article-select"
              value={categoryId ?? ''}
              onChange={(event) =>
                onCategoryChange(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            >
              <option value="">全部分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.status === 'hidden' ? '（已隐藏）' : ''}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="文章标签" htmlFor="article-tag-filter">
            <select
              id="article-tag-filter"
              className="article-select"
              value={tagId ?? ''}
              onChange={(event) =>
                onTagChange(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            >
              <option value="">全部标签</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>
    </form>
  )
}
