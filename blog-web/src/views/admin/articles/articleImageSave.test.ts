import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ArticleSaveParams, ArticleVO } from '@/types/article'
import type { ImageDraft } from '@/types/file'

import {
  createArticleSaveCheckpoint,
  saveArticleWithImages,
  type ArticleImageSaveDependencies,
} from './articleImageSave'

const createDraft = (name = 'content.webp'): ImageDraft => ({
  id: name,
  originalFile: new File(['source'], name, { type: 'image/webp' }),
  previewUrl: `blob:${name}`,
  type: 'static',
  uploadBlob: new Blob(['cropped'], { type: 'image/webp' }),
})

const basePayload: ArticleSaveParams = {
  title: '文章标题',
  content: '正文',
  status: 'draft',
}

const article = (id: number, payload: ArticleSaveParams): ArticleVO => ({
  id,
  title: payload.title,
  summary: payload.summary,
  content: payload.content,
  coverUrl: payload.coverUrl,
  status: payload.status,
  viewCount: 0,
  commentCount: 0,
  createdAt: '2026-07-31T00:00:00Z',
  updatedAt: '2026-07-31T00:00:00Z',
})

describe('Task 12: 文章图片保存编排', () => {
  let dependencies: ArticleImageSaveDependencies

  beforeEach(() => {
    dependencies = {
      cleanupContentImage: vi.fn().mockResolvedValue({ result: 'deleted' }),
      createArticle: vi.fn().mockImplementation(async () => ({ id: 41 })),
      getArticle: vi
        .fn()
        .mockImplementation(async (id) => article(id, basePayload)),
      removeArticleCover: vi.fn().mockResolvedValue(undefined),
      updateArticle: vi
        .fn()
        .mockImplementation(async (id, payload) => article(id, payload)),
      uploadArticleCover: vi
        .fn()
        .mockResolvedValue({ file_url: '/files/articles/cover/cover.webp' }),
      uploadContentImage: vi.fn().mockResolvedValue({
        file_url: '/files/articles/content/content.webp',
      }),
    }
  })

  it('新建文章应先上传正文图片再创建文章并用真实文章 ID 上传封面', async () => {
    // Given 新建文章包含待上传正文图片和待上传封面
    // When 管理员保存文章
    // Then 正文图片先上传并替换本地占位，文章创建成功后才用真实文章 ID 上传封面
    const contentDraft = createDraft()
    const coverDraft = createDraft('cover.webp')
    const events: string[] = []
    vi.mocked(dependencies.uploadContentImage).mockImplementation(async () => {
      events.push('content-upload')
      return { file_url: '/files/articles/content/content.webp' }
    })
    vi.mocked(dependencies.createArticle).mockImplementation(
      async (payload) => {
        events.push('article-create')
        expect(payload.content).toContain(
          '/files/articles/content/content.webp',
        )
        expect(payload.content).not.toContain('blob:')
        return { id: 41 }
      },
    )
    vi.mocked(dependencies.uploadArticleCover).mockImplementation(
      async (articleId) => {
        events.push(`cover-upload-${articleId}`)
        return { file_url: '/files/articles/cover/cover.webp' }
      },
    )

    const result = await saveArticleWithImages(
      {
        articleId: null,
        checkpoint: createArticleSaveCheckpoint(),
        contentDrafts: new Map([[contentDraft.previewUrl, contentDraft]]),
        coverChange: { kind: 'upload', draft: coverDraft },
        initialContent: '',
        mode: 'create',
        payload: {
          ...basePayload,
          content: `![正文图](${contentDraft.previewUrl})`,
        },
      },
      dependencies,
    )

    expect(events).toEqual([
      'content-upload',
      'article-create',
      'cover-upload-41',
    ])
    expect(result.articleId).toBe(41)
    expect(result.payload.coverUrl).toBe('/files/articles/cover/cover.webp')
  })

  it('新建文章封面失败后重试不应重复创建文章', async () => {
    // Given 新文章已经创建成功但封面上传失败
    // When 管理员再次保存重试封面
    // Then 系统沿用第一次取得的真实文章 ID 且不再次创建文章
    const checkpoint = createArticleSaveCheckpoint()
    const contentDraft = createDraft()
    const coverDraft = createDraft('cover.webp')
    vi.mocked(dependencies.uploadArticleCover)
      .mockRejectedValueOnce(new Error('cover failed'))
      .mockResolvedValueOnce({ file_url: '/files/articles/cover/cover.webp' })
    const params = {
      articleId: null,
      checkpoint,
      contentDrafts: new Map([[contentDraft.previewUrl, contentDraft]]),
      coverChange: { kind: 'upload' as const, draft: coverDraft },
      initialContent: '',
      mode: 'create' as const,
      payload: {
        ...basePayload,
        content: `![正文图](${contentDraft.previewUrl})`,
      },
    }

    await expect(saveArticleWithImages(params, dependencies)).rejects.toThrow(
      'cover failed',
    )
    await expect(saveArticleWithImages(params, dependencies)).resolves.toEqual(
      expect.objectContaining({ articleId: 41 }),
    )

    expect(dependencies.createArticle).toHaveBeenCalledTimes(1)
    expect(dependencies.uploadContentImage).toHaveBeenCalledTimes(1)
    expect(dependencies.uploadArticleCover).toHaveBeenCalledTimes(2)
    expect(dependencies.uploadArticleCover).toHaveBeenLastCalledWith(
      41,
      coverDraft,
    )
  })

  it('编辑文章应先保存新正文再清理已移除的线上图片', async () => {
    // Given 编辑正文包含新上传图片并移除了已保存图片
    // When 管理员保存文章
    // Then 系统先上传新图并保存不含旧图的新正文，正文成功后才请求清理旧图
    const draft = createDraft()
    const oldUrl = '/files/articles/content/old.webp'
    const events: string[] = []
    vi.mocked(dependencies.uploadContentImage).mockImplementation(async () => {
      events.push('content-upload')
      return { file_url: '/files/articles/content/new.webp' }
    })
    vi.mocked(dependencies.updateArticle).mockImplementation(
      async (id, payload) => {
        events.push('article-update')
        expect(payload.content).toContain('/files/articles/content/new.webp')
        expect(payload.content).not.toContain(oldUrl)
        return article(id, payload)
      },
    )
    vi.mocked(dependencies.cleanupContentImage).mockImplementation(async () => {
      events.push('content-cleanup')
      return { result: 'retained_in_use' }
    })

    const result = await saveArticleWithImages(
      {
        articleId: 7,
        checkpoint: createArticleSaveCheckpoint(),
        contentDrafts: new Map([[draft.previewUrl, draft]]),
        coverChange: null,
        initialContent: `![旧图](${oldUrl})`,
        mode: 'edit',
        payload: {
          ...basePayload,
          content: `![新图](${draft.previewUrl})`,
        },
      },
      dependencies,
    )

    expect(events).toEqual([
      'content-upload',
      'article-update',
      'content-cleanup',
    ])
    expect(dependencies.cleanupContentImage).toHaveBeenCalledWith(oldUrl)
    expect(result.retainedInUseUrls).toEqual([oldUrl])
  })

  it('编辑文章移除封面应先保存文章再调用真实 ID 的 FastAPI 接口', async () => {
    // Given 已有文章确认在本次保存时移除封面
    // When 管理员保存文章
    // Then Spring 文章保存成功后才用真实文章 ID 请求 FastAPI 移除封面
    const events: string[] = []
    vi.mocked(dependencies.updateArticle).mockImplementation(
      async (id, payload) => {
        events.push('article-update')
        return article(id, payload)
      },
    )
    vi.mocked(dependencies.removeArticleCover).mockImplementation(
      async (id) => {
        events.push(`cover-remove-${id}`)
      },
    )
    vi.mocked(dependencies.getArticle).mockImplementation(async (id) => {
      events.push(`article-confirm-${id}`)
      return article(id, { ...basePayload, coverUrl: undefined })
    })

    const result = await saveArticleWithImages(
      {
        articleId: 7,
        checkpoint: createArticleSaveCheckpoint(),
        contentDrafts: new Map(),
        coverChange: { kind: 'remove' },
        initialContent: '正文',
        mode: 'edit',
        payload: { ...basePayload, coverUrl: '/files/cover/old.webp' },
      },
      dependencies,
    )

    expect(events).toEqual([
      'article-update',
      'cover-remove-7',
      'article-confirm-7',
    ])
    expect(result.payload.coverUrl).toBeUndefined()
    expect(result.article?.coverUrl).toBeUndefined()
  })

  it('Spring 保存失败应补偿本次新上传图片并保留未完成检查点', async () => {
    // Given 待保存正文图片已经上传但 Spring 文章保存失败
    // When 保存流程进入失败恢复
    // Then 系统清理本次新上传图片且检查点保持未保存以便本地草稿再次上传
    const checkpoint = createArticleSaveCheckpoint()
    const draft = createDraft()
    vi.mocked(dependencies.updateArticle).mockRejectedValue(
      new Error('spring failed'),
    )

    await expect(
      saveArticleWithImages(
        {
          articleId: 7,
          checkpoint,
          contentDrafts: new Map([[draft.previewUrl, draft]]),
          coverChange: null,
          initialContent: '',
          mode: 'edit',
          payload: {
            ...basePayload,
            content: `![新图](${draft.previewUrl})`,
          },
        },
        dependencies,
      ),
    ).rejects.toThrow('spring failed')

    expect(dependencies.cleanupContentImage).toHaveBeenCalledWith(
      '/files/articles/content/content.webp',
    )
    expect(checkpoint.articleSaved).toBe(false)
  })

  it('Spring 保存成功后的图片清理失败不应回退正文并可只重试清理', async () => {
    // Given 新正文已经由 Spring 保存成功但旧图片清理失败
    // When 管理员重试未完成的清理
    // Then 系统不重复保存或回退正文并只重试失败的清理项
    const checkpoint = createArticleSaveCheckpoint()
    const oldUrl = '/files/articles/content/old.webp'
    vi.mocked(dependencies.cleanupContentImage)
      .mockRejectedValueOnce(new Error('cleanup failed'))
      .mockResolvedValueOnce({ result: 'deleted' })
    const params = {
      articleId: 7,
      checkpoint,
      contentDrafts: new Map<string, ImageDraft>(),
      coverChange: null,
      initialContent: `![旧图](${oldUrl})`,
      mode: 'edit' as const,
      payload: basePayload,
    }

    await expect(saveArticleWithImages(params, dependencies)).rejects.toThrow(
      'cleanup failed',
    )
    await expect(saveArticleWithImages(params, dependencies)).resolves.toEqual(
      expect.objectContaining({ articleId: 7 }),
    )

    expect(dependencies.updateArticle).toHaveBeenCalledTimes(1)
    expect(dependencies.cleanupContentImage).toHaveBeenCalledTimes(2)
  })

  it('发送给 Spring 的文章数据不得包含本地图片信息或未确认地址', async () => {
    // Given 正文包含未通过上传流程确认的本地或线上图片地址
    // When 系统组装创建或更新文章的数据
    // Then 保存被拒绝且 Spring 不会收到 blob、本地路径或新外部图片地址
    for (const content of [
      '![本地图](blob:unknown)',
      '![本地图](file:///C:/private/image.png)',
      '![外部图](https://example.com/unconfirmed.png)',
    ]) {
      await expect(
        saveArticleWithImages(
          {
            articleId: 7,
            checkpoint: createArticleSaveCheckpoint(),
            contentDrafts: new Map(),
            coverChange: null,
            initialContent: '',
            mode: 'edit',
            payload: { ...basePayload, content },
          },
          dependencies,
        ),
      ).rejects.toThrow('请使用“上传图片”按钮添加正文图片')
    }

    expect(dependencies.updateArticle).not.toHaveBeenCalled()
  })

  it('只上传当前正文实际引用的草稿并忽略撤销历史中的旧草稿', async () => {
    // Given 页面草稿 Map 同时保留当前图片和撤销历史中的旧图片
    // When 管理员保存只引用当前图片的正文
    // Then 只上传当前正文引用的草稿且 Spring 请求不包含本地地址
    const currentDraft = createDraft('current.webp')
    const historyDraft = createDraft('history.webp')
    vi.mocked(dependencies.uploadContentImage).mockImplementation(
      async (draft) => ({
        file_url: `/files/articles/content/${draft.originalFile.name}`,
      }),
    )

    await saveArticleWithImages(
      {
        articleId: 7,
        checkpoint: createArticleSaveCheckpoint(),
        contentDrafts: new Map([
          [currentDraft.previewUrl, currentDraft],
          [historyDraft.previewUrl, historyDraft],
        ]),
        coverChange: null,
        initialContent: '',
        mode: 'edit',
        payload: {
          ...basePayload,
          content: `![当前图片](${currentDraft.previewUrl})`,
        },
      },
      dependencies,
    )

    expect(dependencies.uploadContentImage).toHaveBeenCalledOnce()
    expect(dependencies.uploadContentImage).toHaveBeenCalledWith(currentDraft)
    expect(dependencies.updateArticle).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        content: '![当前图片](/files/articles/content/current.webp)\n',
      }),
    )
  })
})
