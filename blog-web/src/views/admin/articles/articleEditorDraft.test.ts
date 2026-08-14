import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { emptyArticleForm, type ArticleForm } from './articleEditorForm'
import {
  getArticleEditorDraftKey,
  readArticleEditorDraft,
  removeArticleEditorDraft,
  saveArticleEditorDraft,
} from './articleEditorDraft'

const createForm = (): ArticleForm => ({
  ...emptyArticleForm,
  title: '本地草稿标题',
  summary: '本地草稿摘要',
  content: '第一段\n\n![待上传图片](blob:pending-image)\n\n第二段',
  categoryId: 2,
  tagIds: [3, 5],
  isTop: true,
  isRecommend: true,
})

describe('文章编辑本地草稿', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('按新建页和文章 ID 隔离浏览器草稿键', () => {
    expect(getArticleEditorDraftKey(null)).toBe(
      'blog-web:article-editor-draft:new',
    )
    expect(getArticleEditorDraftKey(7)).toBe(
      'blog-web:article-editor-draft:7',
    )
  })

  it('保存并读取可恢复字段，同时排除未上传的本地图片', () => {
    const form = createForm()

    saveArticleEditorDraft(7, form, 1_786_000_000_000)

    const draft = readArticleEditorDraft(7)
    expect(draft).toMatchObject({
      savedAt: 1_786_000_000_000,
      omittedLocalImages: true,
      form: {
        title: form.title,
        summary: form.summary,
        categoryId: form.categoryId,
        tagIds: form.tagIds,
        isTop: true,
        isRecommend: true,
      },
    })
    expect(draft?.form.content).toContain('第一段')
    expect(draft?.form.content).toContain('第二段')
    expect(draft?.form.content).not.toContain('blob:pending-image')
  })

  it('读取结构不合法的草稿时删除缓存并返回空值', () => {
    const key = getArticleEditorDraftKey(7)
    localStorage.setItem(key, JSON.stringify({ form: { title: '不完整' } }))

    expect(readArticleEditorDraft(7)).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('删除草稿后不再返回已保存内容', () => {
    saveArticleEditorDraft(7, createForm(), 1_786_000_000_000)

    removeArticleEditorDraft(7)

    expect(readArticleEditorDraft(7)).toBeNull()
  })
})
