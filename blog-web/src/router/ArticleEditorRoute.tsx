import { lazy, Suspense } from 'react'

import '@/styles/generated/chill-round-gothic.css'

const ArticleEditorView = lazy(() =>
  import('@/views/admin/articles/ArticleEditorView').then((module) => ({
    default: module.ArticleEditorView,
  })),
)

export const ArticleEditorRoute = ({ mode }: { mode: 'create' | 'edit' }) => (
  <Suspense fallback={<div role="status">正在加载文章编辑器。</div>}>
    <ArticleEditorView mode={mode} />
  </Suspense>
)
