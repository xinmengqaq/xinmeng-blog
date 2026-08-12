import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type BlockerFunction,
  useBeforeUnload,
  useBlocker,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { BlockMarkdownEditor } from '@/components/editor/block-markdown-editor'
import {
  Alert,
  Button,
  ConfirmDialog,
  ErrorState,
  LoadingState,
} from '@/components/ui'
import {
  useArticleDetailQuery,
  useDeleteArticleMutation,
} from '@/queries/article'
import { toApiError } from '@/utils/request'

import { ArticleEditorSidebar } from './ArticleEditorSidebar'
import {
  emptyArticleForm,
  toArticleForm,
  toArticleSaveParams,
  type ArticleForm,
  type ArticleFormErrors,
  validateArticleForm,
} from './articleEditorForm'
import { useArticleImageDrafts } from './hooks/useArticleImageDrafts'
import { useArticleImageSave } from './hooks/useArticleImageSave'
import './articlePages.css'

type ArticleEditorViewProps = {
  mode: 'create' | 'edit'
}

type ArticleSaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'

const saveStateLabels: Record<ArticleSaveState, string> = {
  clean: '保存状态：未修改',
  dirty: '保存状态：有未保存修改',
  saving: '保存状态：保存中',
  saved: '保存状态：已保存',
  failed: '保存状态：保存失败',
}

export const ArticleEditorView = ({ mode }: ArticleEditorViewProps) => {
  const navigate = useNavigate()
  const params = useParams()
  const parsedId = mode === 'edit' ? Number(params.id) : null
  const articleId =
    parsedId !== null && Number.isInteger(parsedId) && parsedId > 0
      ? parsedId
      : null
  const invalidArticleId = mode === 'edit' && articleId === null
  const articleQuery = useArticleDetailQuery(articleId ?? 0, {
    enabled: mode === 'edit' && articleId !== null,
  })
  const deleteMutation = useDeleteArticleMutation()
  const [form, setForm] = useState<ArticleForm>(emptyArticleForm)
  const [errors, setErrors] = useState<ArticleFormErrors>({})
  const [saveState, setSaveState] = useState<ArticleSaveState>('clean')
  const [requestError, setRequestError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [taxonomyAvailable, setTaxonomyAvailable] = useState(true)
  const hydratedArticleId = useRef<number | null>(null)
  const initialContentRef = useRef('')
  const allowNavigationRef = useRef(false)
  const imageDrafts = useArticleImageDrafts()
  const imageSave = useArticleImageSave()

  const hasUnsavedChanges =
    saveState === 'dirty' ||
    saveState === 'failed' ||
    saveState === 'saving' ||
    Boolean(imageDrafts.coverChange) ||
    imageDrafts.contentDrafts.size > 0
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      !allowNavigationRef.current &&
      hasUnsavedChanges &&
      currentLocation.pathname !== nextLocation.pathname,
    [hasUnsavedChanges],
  )
  const blocker = useBlocker(shouldBlock)

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!hasUnsavedChanges) return
        event.preventDefault()
        event.returnValue = ''
      },
      [hasUnsavedChanges],
    ),
  )

  useEffect(() => {
    if (blocker.state === 'blocked') setLeaveOpen(true)
  }, [blocker.state])

  useEffect(() => {
    const article = articleQuery.data
    if (
      !article ||
      mode !== 'edit' ||
      hydratedArticleId.current === article.id
    ) {
      return
    }
    hydratedArticleId.current = article.id
    initialContentRef.current = article.content ?? ''
    setForm(toArticleForm(article))
    setErrors({})
    setSaveState('clean')
  }, [articleQuery.data, mode])

  const updateField = <Key extends keyof ArticleForm>(
    key: Key,
    value: ArticleForm[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setRequestError(null)
    setSaveNotice(null)
    setSaveState('dirty')
  }

  const saveArticle = async () => {
    if (imageSave.isPending) return
    const nextErrors = validateArticleForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setSaveState('dirty')
      return
    }
    if (!taxonomyAvailable) {
      setRequestError('分类或标签加载失败，请恢复连接后再保存文章')
      return
    }
    const payload = toArticleSaveParams(form)
    setRequestError(null)
    setSaveNotice(null)
    setSaveState('saving')
    try {
      const result = await imageSave.save({
        articleId,
        contentDrafts: imageDrafts.contentDrafts,
        coverChange: imageDrafts.coverChange,
        initialContent: initialContentRef.current,
        mode,
        payload,
      })
      initialContentRef.current = result.payload.content
      imageDrafts.discardAll()
      if (result.retainedInUseUrls.length > 0) {
        setSaveNotice('图片已从当前文章移除，但仍被其他文章使用')
      }
      setSaveState('saved')
      if (mode === 'create') {
        allowNavigationRef.current = true
        navigate(`/admin/articles/${result.articleId}/edit`, { replace: true })
      } else {
        setForm(toArticleForm(result.article ?? {}, result.payload))
      }
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : toApiError(error).message,
      )
      setSaveState('failed')
    }
  }

  const deleteCurrentArticle = async () => {
    if (articleId === null) return
    setRequestError(null)
    try {
      await deleteMutation.mutateAsync(articleId)
      setDeleteOpen(false)
      allowNavigationRef.current = true
      navigate('/admin/articles', { replace: true })
    } catch (error) {
      setRequestError(toApiError(error).message)
    }
  }

  if (invalidArticleId) {
    return (
      <section className="admin-page article-page">
        <ErrorState
          title="文章 ID 无效"
          description="当前编辑地址中的文章 ID 不是有效数字。"
          actionText="返回文章列表"
          onRetry={() => navigate('/admin/articles')}
        />
      </section>
    )
  }

  if (mode === 'edit' && articleQuery.isError) {
    return (
      <section className="admin-page article-page">
        <ErrorState
          description={toApiError(articleQuery.error).message}
          onRetry={() => void articleQuery.refetch()}
        />
      </section>
    )
  }

  if (mode === 'edit' && !articleQuery.data) {
    return (
      <section className="admin-page article-page">
        <LoadingState description="正在加载文章详情。" />
      </section>
    )
  }

  const saving = imageSave.isPending
  const displayedSaveState =
    imageDrafts.coverChange && (saveState === 'clean' || saveState === 'saved')
      ? 'dirty'
      : saveState

  return (
    <section className="admin-page article-page article-editor-page">
      <header className="article-editor-topline">
        <Button
          icon={<ArrowLeft />}
          size="sm"
          variant="link"
          onClick={() => navigate('/admin/articles')}
        >
          返回文章列表
        </Button>
        <h1>{mode === 'create' ? '新建文章' : '编辑文章'}</h1>
        <span
          className={`article-save-status article-save-status--${displayedSaveState}`}
          role="status"
        >
          {saveStateLabels[displayedSaveState]}
        </span>
      </header>

      {requestError ? <Alert type="error">{requestError}</Alert> : null}
      {saveNotice ? <Alert type="info">{saveNotice}</Alert> : null}

      <div className="article-editor-layout">
        <main className="article-editor-content" aria-label="文章正文区域">
          {errors.content ? (
            <span className="article-editor-inline-error" role="alert">
              {errors.content}
            </span>
          ) : null}
          <BlockMarkdownEditor
            disabled={saving}
            imageDrafts={imageDrafts.contentDrafts}
            value={form.content}
            onImageDraftCreate={imageDrafts.registerContentDraft}
            onImageDraftRelease={imageDrafts.releaseContentDraft}
            onChange={(content) => updateField('content', content)}
            onSaveShortcut={() => void saveArticle()}
          />
        </main>

        <ArticleEditorSidebar
          coverChange={imageDrafts.coverChange}
          errors={errors}
          form={form}
          mode={mode}
          saving={saving}
          onCoverChange={imageDrafts.setCoverChange}
          onDelete={() => setDeleteOpen(true)}
          onSave={() => void saveArticle()}
          onTaxonomyAvailabilityChange={setTaxonomyAvailable}
          onUpdate={updateField}
        />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="删除文章"
        description={`确认删除“${form.title}”吗？此操作无法撤销。`}
        confirmText="删除文章"
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteCurrentArticle()}
      />

      <ConfirmDialog
        cancelText="继续编辑"
        confirmText="放弃变更"
        description="当前文章有未保存内容。放弃后本地图片和编辑内容不会保留，也不会发送文件请求。"
        open={leaveOpen}
        title="放弃文章变更"
        onCancel={() => {
          setLeaveOpen(false)
          if (blocker.state === 'blocked') blocker.reset()
        }}
        onConfirm={() => {
          imageDrafts.discardAll()
          setLeaveOpen(false)
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </section>
  )
}
