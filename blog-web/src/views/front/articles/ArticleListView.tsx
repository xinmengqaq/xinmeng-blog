import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  FrontArticleBadges,
  FrontArticleImage,
  FrontArticleMeta,
} from '@/components/front/article'
import { FrontTagDialog } from '@/components/front/filters/FrontTagDialog'
import { FrontFilterSelect } from '@/components/front/filters/FrontFilterSelect'
import { LoadingState } from '@/components/ui/LoadingState'
import { FrontSceneBanner } from '@/components/front/layout/FrontSceneBanner'
import { FrontSiteBackground } from '@/components/front/layout/FrontSiteBackground'
import { FrontIcon, FrontState } from '@/components/front/visual'
import { frontSite } from '@/config/frontSite'
import {
  usePublicArticlePageQuery,
  useArticleFilterMetaQuery,
  usePublicCategoriesQuery,
  usePublicTagsQuery,
} from '@/queries/publicContent'
import {
  normalizePublicArticleFilters,
  parsePublicArticleFilters,
  serializePublicArticleFilters,
  updatePublicArticleFilters,
  type PublicArticleFilters,
} from '@/utils/publicArticleFilters'

const setParams = (
  setSearchParams: (params: URLSearchParams) => void,
  filters: PublicArticleFilters,
) => setSearchParams(serializePublicArticleFilters(filters))

export const ArticleListView = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(
    () => parsePublicArticleFilters(searchParams),
    [searchParams],
  )
  const [keyword, setKeyword] = useState(filters.keyword)
  const [tagOpen, setTagOpen] = useState(false)
  const tagTriggerRef = useRef<HTMLButtonElement>(null)
  const articles = usePublicArticlePageQuery(filters)
  const tags = usePublicTagsQuery()
  const categories = usePublicCategoriesQuery()
  const meta = useArticleFilterMetaQuery()
  useEffect(() => setKeyword(filters.keyword), [filters.keyword])
  useEffect(() => {
    if (keyword.trim() === filters.keyword) return
    const timeout = window.setTimeout(() => {
      setParams(
        setSearchParams,
        updatePublicArticleFilters(filters, { keyword }),
      )
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [filters, keyword, setSearchParams])
  const update = (changes: Partial<PublicArticleFilters>) =>
    setParams(setSearchParams, updatePublicArticleFilters(filters, changes))
  const updatePage = (page: number) =>
    setParams(
      setSearchParams,
      normalizePublicArticleFilters({ ...filters, page }),
    )
  const closeTagDialog = useCallback(() => {
    setTagOpen(false)
    window.requestAnimationFrame(() =>
      tagTriggerRef.current?.focus({ preventScroll: true }),
    )
  }, [])
  const years = meta.data?.archives ?? []
  const months = years.find((year) => year.year === filters.year)?.months ?? []
  return (
    <div className="front-list">
      <FrontSceneBanner
        className="list-banner"
        media={<FrontSiteBackground />}
        stationLabel={frontSite.stationFallback}
      >
        <div className="front-container">
          <p>按时间翻阅，找到想读的那一篇</p>
          <h1>文章</h1>
        </div>
      </FrontSceneBanner>
      <main className="front-container front-list__body">
        <section className="front-article-filters" aria-label="文章筛选">
          <label className="filter-search">
            <FrontIcon
              name="search"
              size={16}
              state={keyword ? 'active' : 'default'}
            />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && keyword !== filters.keyword) {
                  update({ keyword })
                }
              }}
              placeholder="搜索标题或摘要"
            />
          </label>
          <div className="filter-period" role="group" aria-label="发布时间筛选">
            <span className="filter-period__label">
              <FrontIcon name="date" size={16} />
              发布时间
            </span>
            <FrontFilterSelect
              ariaLabel="发布年份"
              placeholder="年份"
              value={filters.year?.toString() ?? ''}
              options={[
                { value: '', label: '全部年份' },
                ...years.map((year) => ({
                  value: year.year.toString(),
                  label: year.year.toString(),
                })),
              ]}
              onChange={(value) =>
                update({
                  year: value ? Number(value) : undefined,
                  month: undefined,
                })
              }
            />
            <span className="filter-period__separator" aria-hidden="true">
              /
            </span>
            <FrontFilterSelect
              ariaLabel="发布月份"
              disabled={!filters.year}
              placeholder="月份"
              value={filters.month?.toString() ?? ''}
              options={[
                { value: '', label: '全部月份' },
                ...months.map((month) => ({
                  value: month.month.toString(),
                  label: `${month.month} 月`,
                })),
              ]}
              onChange={(value) =>
                update({ month: value ? Number(value) : undefined })
              }
            />
          </div>
          <button
            ref={tagTriggerRef}
            className="front-button front-button--quiet filter-tags"
            type="button"
            onClick={() => setTagOpen(true)}
          >
            <FrontIcon
              name="tag"
              size={24}
              state={filters.tagIds.length ? 'active' : 'default'}
            />
            更多标签
          </button>
        </section>
        <div className="filter-summary">
          <span>
            <FrontIcon name="category" size={16} />
            当前：
            {filters.categoryId
              ? categories.data?.find((item) => item.id === filters.categoryId)
                  ?.name || `分类 ${filters.categoryId}`
              : '全部文章'}
          </span>
          {filters.keyword ? (
            <button type="button" onClick={() => update({ keyword: '' })}>
              关键词：{filters.keyword} <FrontIcon name="close" size={16} />
            </button>
          ) : null}
          {filters.tagIds.map((id) => {
            const tag = tags.data?.find((item) => item.id === id)
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  update({
                    tagIds: filters.tagIds.filter((value) => value !== id),
                  })
                }
              >
                标签：{tag?.name || id} <FrontIcon name="close" size={16} />
              </button>
            )
          })}
          <button
            type="button"
            onClick={() =>
              setParams(setSearchParams, normalizePublicArticleFilters({}))
            }
          >
            清空条件
          </button>
        </div>
        <section className="article-results" aria-live="polite">
          {articles.isLoading ? <LoadingState title="正在加载文章" /> : null}
          {articles.isError ? (
            <FrontState
              variant="error"
              title="文章暂时无法加载"
              description="公开文章列表读取失败，请稍后重试。"
              onAction={() => void articles.refetch()}
            />
          ) : null}
          {articles.isSuccess && articles.data.list.length === 0 ? (
            <FrontState
              variant="empty"
              title="没有匹配的文章"
              description="保留你的条件，换一个关键词或清空筛选再试。"
            />
          ) : null}
          {articles.data?.list.map((article, index) => (
            <Link
              className={`article-result ${index % 2 ? 'is-reverse' : ''}`}
              key={article.id}
              to={`/articles/${article.id}`}
            >
              <div className="article-result__copy">
                <div className="article-result__heading">
                  <h2>{article.title}</h2>
                  <FrontArticleBadges
                    isTop={article.isTop}
                    isRecommend={article.isRecommend}
                  />
                </div>
                <p>
                  {article.summary || '这篇文章还没有摘要，进入正文看看吧。'}
                </p>
                <FrontArticleMeta {...article} />
              </div>
              <div className="article-result__image">
                <FrontArticleImage src={article.coverUrl} alt={article.title} />
              </div>
            </Link>
          ))}
        </section>
        {articles.data && articles.data.pages > 1 ? (
          <nav className="pagination" aria-label="文章分页">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => updatePage(filters.page - 1)}
              aria-label="上一页"
              title="上一页"
            >
              <FrontIcon name="back" size={24} />
            </button>
            {Array.from(
              { length: articles.data.pages },
              (_, index) => index + 1,
            )
              .slice(0, 7)
              .map((page) => (
                <button
                  className={page === filters.page ? 'is-active' : ''}
                  type="button"
                  key={page}
                  onClick={() => updatePage(page)}
                >
                  {page}
                </button>
              ))}
            <button
              type="button"
              disabled={filters.page >= articles.data.pages}
              onClick={() => updatePage(filters.page + 1)}
              aria-label="下一页"
              title="下一页"
            >
              <FrontIcon name="forward" size={24} />
            </button>
          </nav>
        ) : null}
      </main>
      <FrontTagDialog
        open={tagOpen}
        tags={tags.data ?? []}
        selected={filters.tagIds}
        onClose={closeTagDialog}
        onChange={(ids) => update({ tagIds: ids })}
      />
    </div>
  )
}
