import { Save, Trash2 } from 'lucide-react'

import { Button, FormField, Input } from '@/components/ui'

import { ArticleCoverEditor } from './ArticleCoverEditor'
import { ArticleMarkdownImportControl } from './ArticleMarkdownImportControl'
import type { ArticleForm, ArticleFormErrors } from './articleEditorForm'
import { ArticlePublishFields } from './ArticlePublishFields'
import { ArticleTaxonomyFields } from './ArticleTaxonomyFields'
import type { ArticleCoverChange } from '@/types/file'

type ArticleEditorSidebarProps = {
  coverChange: ArticleCoverChange | null
  errors: ArticleFormErrors
  form: ArticleForm
  mode: 'create' | 'edit'
  saving: boolean
  onCoverChange: (change: ArticleCoverChange | null) => void
  onDelete: () => void
  onSave: () => void
  onTaxonomyAvailabilityChange: (available: boolean) => void
  onUpdate: <Key extends keyof ArticleForm>(
    key: Key,
    value: ArticleForm[Key],
  ) => void
}

export const ArticleEditorSidebar = ({
  coverChange,
  errors,
  form,
  mode,
  saving,
  onCoverChange,
  onDelete,
  onSave,
  onTaxonomyAvailabilityChange,
  onUpdate,
}: ArticleEditorSidebarProps) => (
  <aside className="article-editor-sidebar" aria-label="文章信息">
    <div className="article-editor-panel">
      <header>
        <h2>文章信息</h2>
        <p>设置标题、摘要和封面。</p>
      </header>
      <ArticleMarkdownImportControl
        currentContent={form.content}
        disabled={saving}
        onImport={(content) => onUpdate('content', content)}
      />
      <FormField
        required
        error={errors.title}
        htmlFor="article-title"
        label="标题"
      >
        <Input
          aria-label="标题"
          id="article-title"
          value={form.title}
          error={Boolean(errors.title)}
          onChange={(event) => onUpdate('title', event.target.value)}
        />
      </FormField>
      <FormField
        error={errors.summary}
        htmlFor="article-summary"
        label="摘要"
      >
        <textarea
          aria-label="摘要"
          id="article-summary"
          className="article-editor-textarea"
          value={form.summary}
          aria-invalid={Boolean(errors.summary) || undefined}
          onChange={(event) => onUpdate('summary', event.target.value)}
        />
      </FormField>
      <ArticleCoverEditor
        change={coverChange}
        currentCover={form.coverUrl}
        disabled={saving}
        title={form.title}
        onChange={onCoverChange}
      />
      <section className="article-editor-group">
        <header>
          <h2>内容关联</h2>
          <p>选择文章分类和标签。</p>
        </header>
        <ArticleTaxonomyFields
          categoryId={form.categoryId}
          tagIds={form.tagIds}
          onAvailabilityChange={onTaxonomyAvailabilityChange}
          onCategoryChange={(categoryId) => onUpdate('categoryId', categoryId)}
          onTagIdsChange={(tagIds) => onUpdate('tagIds', tagIds)}
        />
      </section>
      <section className="article-editor-group">
        <header>
          <h2>发布设置</h2>
          <p>控制文章状态和内容优先级。</p>
        </header>
        <ArticlePublishFields
          status={form.status}
          isTop={form.isTop}
          isRecommend={form.isRecommend}
          onStatusChange={(status) => onUpdate('status', status)}
          onTopChange={(isTop) => onUpdate('isTop', isTop)}
          onRecommendChange={(isRecommend) =>
            onUpdate('isRecommend', isRecommend)
          }
        />
      </section>
      <Button icon={<Save />} loading={saving} onClick={onSave}>
        {saving ? '保存中' : '保存文章'}
      </Button>
    </div>
    {mode === 'edit' ? (
      <div className="article-editor-danger-zone">
        <div>
          <h2>危险区</h2>
          <p>删除后无法恢复，请确认文章不再需要。</p>
        </div>
        <Button icon={<Trash2 />} variant="danger" onClick={onDelete}>
          删除文章
        </Button>
      </div>
    ) : null}
  </aside>
)
