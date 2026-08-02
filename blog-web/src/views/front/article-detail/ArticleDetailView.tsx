import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  FrontArticleBadges,
  FrontArticleImage,
  FrontArticleMeta,
} from '@/components/front/article'
import { ArticleContent } from '@/components/front/reading/articleContent'
import { parseArticleContent } from '@/components/front/reading/articleContentModel'
import {
  ReadingRail,
  ReadingSettings,
} from '@/components/front/reading/ReadingControls'
import { FrontIcon, FrontState } from '@/components/front/visual'
import {
  getLikeErrorMessage,
  getScrollBehavior,
} from '@/utils/publicArticleInteraction'
import {
  useReadingPreferences,
  readingPreferenceStyles,
} from '@/hooks/front/readingPreferences'
import { useReadingProgress } from '@/hooks/front/readingProgress'
import {
  useLikePublicArticleMutation,
  usePublicArticleDetailQuery,
} from '@/queries/publicContent'
import { LoadingState } from '@/components/ui/LoadingState'
import { FrontSceneBanner } from '@/components/front/layout/FrontSceneBanner'

export const ArticleDetailView = () => {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const valid = Number.isInteger(id) && id > 0
  const article = usePublicArticleDetailQuery(id, { enabled: valid })
  const contentRef = useRef<HTMLElement>(null)
  const tocTriggerRef = useRef<HTMLButtonElement>(null)
  const settingsTriggerRef = useRef<HTMLButtonElement>(null)
  const tocSelectionTimerRef = useRef<number | null>(null)
  const tocNoticeTimerRef = useRef<number | null>(null)
  const tocSelectionLockedRef = useRef(false)
  const progress = useReadingProgress(contentRef)
  const { preferences, update } = useReadingPreferences()
  const like = useLikePublicArticleMutation()
  const [likeError, setLikeError] = useState('')
  const [activeId, setActiveId] = useState('')
  const [tocNoticeVisible, setTocNoticeVisible] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'toc' | 'settings' | null>(
    null,
  )
  const parsed = useMemo(
    () => parseArticleContent(article.data?.content ?? '', article.data?.title),
    [article.data?.content, article.data?.title],
  )
  useEffect(() => {
    setLikeError('')
    setActiveId('')
    setTocNoticeVisible(false)
  }, [id])
  useEffect(
    () => () => {
      if (tocSelectionTimerRef.current != null) {
        window.clearTimeout(tocSelectionTimerRef.current)
      }
      if (tocNoticeTimerRef.current != null) {
        window.clearTimeout(tocNoticeTimerRef.current)
      }
    },
    [],
  )
  const closeMobilePanel = useCallback(() => {
    const trigger =
      mobilePanel === 'toc' ? tocTriggerRef.current : settingsTriggerRef.current
    setMobilePanel(null)
    window.requestAnimationFrame(() => trigger?.focus())
  }, [mobilePanel])
  useEffect(() => {
    if (!mobilePanel) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMobilePanel()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [closeMobilePanel, mobilePanel])
  const navigateToHeading = useCallback((headingId: string) => {
    const target = document.getElementById(headingId)
    if (!target) return

    if (tocSelectionTimerRef.current != null) {
      window.clearTimeout(tocSelectionTimerRef.current)
    }
    if (tocNoticeTimerRef.current != null) {
      window.clearTimeout(tocNoticeTimerRef.current)
    }

    tocSelectionLockedRef.current = true
    setActiveId(headingId)
    setTocNoticeVisible(true)
    window.history.replaceState(window.history.state, '', `#${headingId}`)
    target.scrollIntoView({
      block: 'start',
      behavior: getScrollBehavior(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    })

    tocSelectionTimerRef.current = window.setTimeout(() => {
      tocSelectionLockedRef.current = false
    }, 900)
    tocNoticeTimerRef.current = window.setTimeout(() => {
      setTocNoticeVisible(false)
    }, 1800)
  }, [])
  useEffect(() => {
    if (!parsed.headings.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (tocSelectionLockedRef.current) return
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0]
        if (current) setActiveId(current.target.id)
      },
      { rootMargin: '-15% 0px -65% 0px' },
    )
    parsed.headings.forEach((heading) => {
      const element = document.getElementById(heading.id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [parsed.headings])
  if (!valid)
    return (
      <div className="front-container detail-state">
        <FrontState
          variant="error"
          title="文章地址无效"
          description="请返回文章列表选择一篇可以公开阅读的文章。"
        />
      </div>
    )
  if (article.isLoading)
    return (
      <div className="front-container detail-state">
        <LoadingState title="正在打开文章" />
      </div>
    )
  if (article.isError || !article.data)
    return (
      <div className="front-container detail-state">
        <FrontState
          variant="error"
          title="这篇文章暂时无法公开阅读"
          description="文章可能已下线，或服务暂时没有响应。"
          onAction={() => void article.refetch()}
        />
      </div>
    )
  const data = article.data
  const submitLike = async () => {
    setLikeError('')
    try {
      await like.mutateAsync(id)
    } catch (error) {
      setLikeError(getLikeErrorMessage(error))
    }
  }
  const backToTop = () =>
    window.scrollTo({
      top: 0,
      behavior: getScrollBehavior(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    })
  return (
    <div className="front-detail">
      <FrontSceneBanner
        className="detail-banner"
        media={
          data.coverUrl ? (
            <FrontArticleImage src={data.coverUrl} alt={data.title} />
          ) : (
            <div
              className="detail-banner__placeholder"
              role="img"
              aria-label={`${data.title}图片占位`}
            />
          )
        }
      />
      <div className="front-container detail-body">
        <Link to="/articles" className="detail-back">
          <FrontIcon name="back" size={24} />
          返回文章列表
        </Link>
        <div className="detail-layout">
          <article
            ref={contentRef}
            className="detail-article"
            style={readingPreferenceStyles(preferences)}
          >
            <header className="detail-header">
              <div className="detail-kicker">
                <span className="detail-category">
                  <FrontIcon name="category" size={16} />
                  {data.categoryName || '沿途随笔'}
                </span>
                <FrontArticleBadges
                  isTop={data.isTop}
                  isRecommend={data.isRecommend}
                />
              </div>
              <h1>{data.title}</h1>
              <div className="detail-meta">
                <FrontArticleMeta {...data} showCategory={false} />
              </div>
              {data.tags.length > 0 ? (
                <div className="detail-tags" aria-label="文章标签">
                  <FrontIcon name="tag" size={24} />
                  {data.tags.map((tag) => (
                    <span key={tag.id}>{tag.name}</span>
                  ))}
                </div>
              ) : null}
            </header>
            {data.content ? (
              <ArticleContent parsed={parsed} />
            ) : (
              <FrontState
                variant="empty"
                title="这篇文章还没有正文"
                description="作者发布正文后，这里会显示完整内容。"
                compact
              />
            )}
            <div className="detail-like">
              <button
                className="like-button"
                type="button"
                disabled={like.isPending}
                onClick={() => void submitLike()}
              >
                <FrontIcon
                  name="like"
                  size={24}
                  state={like.isSuccess ? 'success' : 'default'}
                />
                {like.isSuccess ? '已喜欢' : '喜欢'}{' '}
                <strong>{like.data?.likeCount ?? data.likeCount ?? 0}</strong>
              </button>
              {likeError ? <span role="alert">{likeError}</span> : null}
            </div>
          </article>
          <ReadingRail
            headings={parsed.headings}
            progress={progress}
            activeId={activeId}
            preferences={preferences}
            update={update}
            onNavigate={navigateToHeading}
            onBackTop={backToTop}
          />
        </div>
      </div>
      <div className="detail-toolbar">
        <button
          ref={tocTriggerRef}
          type="button"
          onClick={() => setMobilePanel('toc')}
          aria-label="打开文章目录"
          title="文章目录"
        >
          <FrontIcon name="tableOfContents" size={24} />
        </button>
        <button
          ref={settingsTriggerRef}
          type="button"
          onClick={() => setMobilePanel('settings')}
          aria-label="打开阅读设置"
          title="阅读设置"
        >
          <FrontIcon name="readingSettings" size={24} />
        </button>
        <button
          type="button"
          onClick={backToTop}
          aria-label="返回顶部"
          title="返回顶部"
        >
          <FrontIcon name="backToTop" size={24} />
        </button>
      </div>
      {mobilePanel ? (
        <div className="mobile-reading-panel">
          <button
            className="mobile-reading-panel__backdrop"
            type="button"
            aria-label="关闭阅读面板"
            onClick={closeMobilePanel}
          />
          <div className="mobile-reading-panel__sheet">
            <header>
              <strong>
                <FrontIcon
                  name={
                    mobilePanel === 'toc'
                      ? 'tableOfContents'
                      : 'readingSettings'
                  }
                  size={24}
                />
                {mobilePanel === 'toc' ? '文章目录' : '阅读设置'}
              </strong>
              <button
                type="button"
                onClick={closeMobilePanel}
                aria-label="关闭"
              >
                <FrontIcon name="close" size={24} />
              </button>
            </header>
            {mobilePanel === 'toc' ? (
              <nav className="mobile-toc">
                {parsed.headings.map((heading) => (
                  <a
                    className={activeId === heading.id ? 'is-active' : ''}
                    key={heading.id}
                    href={`#${heading.id}`}
                    onClick={(event) => {
                      event.preventDefault()
                      navigateToHeading(heading.id)
                      setMobilePanel(null)
                    }}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            ) : (
              <ReadingSettings preferences={preferences} update={update} />
            )}
          </div>
        </div>
      ) : null}
      {tocNoticeVisible ? (
        <div className="detail-toc-notice" role="status" aria-live="polite">
          已移动到当前标题
        </div>
      ) : null}
    </div>
  )
}
