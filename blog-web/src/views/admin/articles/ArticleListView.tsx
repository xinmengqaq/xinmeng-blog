import { ListChecks, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '@/components/ui'
import {
  useArticlePageQuery,
  useDeleteArticleMutation,
} from '@/queries/article'
import { useCategoriesQuery, useTagsQuery } from '@/queries/taxonomy'
import type { ArticleStatus, ArticleVO } from '@/types/article'
import { toApiError } from '@/utils/request'

import { ArticleListFilters } from './ArticleListFilters'
import { ArticleBatchBar } from './ArticleBatchBar'
import { ArticleListItem } from './ArticleListItem'
import { ArticleListPagination } from './ArticleListPagination'
import './articlePages.css'

const pageSize = 10

type ArticleFilters = {
  keyword: string
  status: ArticleStatus | ''
  categoryId: number | null
  tagId: number | null
}

const emptyFilters: ArticleFilters = {
  keyword: '',
  status: '',
  categoryId: null,
  tagId: null,
}

export const ArticleListView = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialFilters = {
    ...emptyFilters,
    categoryId: Number(searchParams.get('categoryId')) || null,
    tagId: Number(searchParams.get('tagId')) || null,
  }
  const [draftFilters, setDraftFilters] =
    useState<ArticleFilters>(initialFilters)
  const [filters, setFilters] = useState<ArticleFilters>(initialFilters)
  const [page, setPage] = useState(1)
  const [filterError, setFilterError] = useState<string | undefined>()
  const [articleToDelete, setArticleToDelete] = useState<ArticleVO | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const articlePageQuery = useArticlePageQuery({
    page,
    size: pageSize,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
    categoryId: filters.categoryId || undefined,
    tagId: filters.tagId || undefined,
  })
  const categoriesQuery = useCategoriesQuery()
  const tagsQuery = useTagsQuery()
  const deleteMutation = useDeleteArticleMutation()
  const articlePage = articlePageQuery.data

  const handleSearch = () => {
    if (draftFilters.keyword.length > 50) {
      setFilterError('关键词最多 50 个字符')
      return
    }

    setFilterError(undefined)
    setPage(1)
    setFilters({
      keyword: draftFilters.keyword.trim(),
      status: draftFilters.status,
      categoryId: draftFilters.categoryId,
      tagId: draftFilters.tagId,
    })
  }

  const handleReset = () => {
    setDraftFilters(emptyFilters)
    setFilters(emptyFilters)
    setFilterError(undefined)
    setPage(1)
  }

  const handleDelete = async () => {
    if (!articleToDelete) {
      return
    }

    try {
      await deleteMutation.mutateAsync(articleToDelete.id)
      setArticleToDelete(null)
      setDeleteError(null)
      if (articlePageQuery.data?.list.length === 1 && page > 1) {
        setPage(page - 1)
      }
    } catch (error) {
      setDeleteError(toApiError(error).message)
    }
  }

  const hasFilters = Boolean(
    filters.keyword || filters.status || filters.categoryId || filters.tagId,
  )
  const pageIds = articlePage?.list.map((article) => article.id) ?? []
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))

  const exitBatchMode = () => {
    setBatchMode(false)
    setSelectedIds(new Set())
  }
  const changePage = (nextPage: number) => {
    setSelectedIds(new Set())
    setPage(nextPage)
  }

  return (
    <section className="admin-page article-page">
      <PageHeader
        title="文章管理"
        description="查看、筛选和维护博客文章。"
        actions={
          <>
            <Button
              icon={<ListChecks />}
              variant="secondary"
              onClick={() => setBatchMode(true)}
            >
              批量管理
            </Button>
            <Button
              icon={<Plus />}
              onClick={() => navigate('/admin/articles/new')}
            >
              新建文章
            </Button>
          </>
        }
      />

      <ArticleListFilters
        keyword={draftFilters.keyword}
        status={draftFilters.status}
        categoryId={draftFilters.categoryId}
        tagId={draftFilters.tagId}
        categories={categoriesQuery.data ?? []}
        tags={tagsQuery.data ?? []}
        loading={articlePageQuery.isFetching}
        error={filterError}
        onKeywordChange={(keyword) => {
          setDraftFilters((current) => ({ ...current, keyword }))
          setFilterError(undefined)
        }}
        onStatusChange={(status) =>
          setDraftFilters((current) => ({ ...current, status }))
        }
        onCategoryChange={(categoryId) =>
          setDraftFilters((current) => ({ ...current, categoryId }))
        }
        onTagChange={(tagId) =>
          setDraftFilters((current) => ({ ...current, tagId }))
        }
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {deleteError ? <Alert type="error">{deleteError}</Alert> : null}

      {batchMode && articlePage?.list.length ? (
        <ArticleBatchBar
          selectedIds={[...selectedIds]}
          allSelected={allSelected}
          onToggleAll={() =>
            setSelectedIds(allSelected ? new Set() : new Set(pageIds))
          }
          onExit={exitBatchMode}
          onDeleted={(deletedCount) => {
            setDeleteError(`已删除 ${deletedCount} 篇文章`)
            exitBatchMode()
          }}
          onError={setDeleteError}
        />
      ) : null}

      {articlePageQuery.isError ? (
        <ErrorState
          description={toApiError(articlePageQuery.error).message}
          onRetry={() => void articlePageQuery.refetch()}
        />
      ) : !articlePage ? (
        <LoadingState description="正在加载文章列表。" />
      ) : articlePage.list.length === 0 ? (
        <EmptyState
          title={hasFilters ? '没有找到符合条件的文章' : '还没有文章'}
          description={
            hasFilters
              ? '请调整筛选条件后重新查询。'
              : '新建第一篇文章，开始维护博客内容。'
          }
          actionText={hasFilters ? '重置筛选' : '新建文章'}
          onAction={
            hasFilters ? handleReset : () => navigate('/admin/articles/new')
          }
        />
      ) : (
        <div className="article-list">
          {articlePage.list.map((article) => (
            <ArticleListItem
              key={article.id}
              article={article}
              onEdit={(id) => navigate(`/admin/articles/${id}/edit`)}
              onDelete={(nextArticle) => {
                setDeleteError(null)
                setArticleToDelete(nextArticle)
              }}
              onError={setDeleteError}
              batchMode={batchMode}
              selected={selectedIds.has(article.id)}
              onSelect={(nextArticle, selected) =>
                setSelectedIds((current) => {
                  const next = new Set(current)
                  if (selected) next.add(nextArticle.id)
                  else next.delete(nextArticle.id)
                  return next
                })
              }
            />
          ))}
          <ArticleListPagination
            page={articlePage.page}
            pages={articlePage.pages}
            total={articlePage.total}
            onPageChange={changePage}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(articleToDelete)}
        title="删除文章"
        description={`确认删除“${articleToDelete?.title ?? ''}”吗？此操作无法撤销。`}
        confirmText="删除文章"
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setArticleToDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  )
}
