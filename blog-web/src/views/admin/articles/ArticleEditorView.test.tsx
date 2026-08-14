import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createArticle,
  deleteArticle,
  getArticleDetail,
  updateArticle,
} from '@/api/article'
import { removeArticleCover } from '@/api/file'
import { getCategories, getTags } from '@/api/taxonomy'
import type { ArticleVO } from '@/types/article'

import { ArticleEditorView } from './ArticleEditorView'
import { emptyArticleForm } from './articleEditorForm'
import {
  readArticleEditorDraft,
  saveArticleEditorDraft,
} from './articleEditorDraft'

vi.mock('@/api/article', () => ({
  createArticle: vi.fn(),
  deleteArticle: vi.fn(),
  getArticleDetail: vi.fn(),
  getArticlePage: vi.fn(),
  updateArticle: vi.fn(),
}))

vi.mock('@/api/file', () => ({
  cleanupContentImage: vi.fn(),
  removeArticleCover: vi.fn(),
  uploadArticleCover: vi.fn(),
  uploadContentImage: vi.fn(),
}))

vi.mock('@/api/taxonomy', () => ({
  createCategory: vi.fn(),
  createTag: vi.fn(),
  deleteCategory: vi.fn(),
  deleteTag: vi.fn(),
  getCategories: vi.fn(),
  getTags: vi.fn(),
  updateCategory: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('@/components/editor/block-markdown-editor', () => ({
  BlockMarkdownEditor: ({
    value,
    onChange,
    onSaveShortcut,
  }: {
    value: string
    onChange: (value: string) => void
    onSaveShortcut?: () => void
  }) => (
    <textarea
      aria-label="文章正文"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.ctrlKey && event.key.toLowerCase() === 's') {
          event.preventDefault()
          onSaveShortcut?.()
        }
      }}
    />
  ),
}))

const article: ArticleVO = {
  id: 7,
  title: '已有文章',
  summary: '已有摘要',
  content: '# 已有正文',
  coverUrl: 'https://example.com/cover.png',
  status: 'published',
  viewCount: 3,
  commentCount: 1,
  publishedAt: '2026-07-09T08:00:00Z',
  createdAt: '2026-07-09T08:00:00Z',
  updatedAt: '2026-07-10T08:00:00Z',
}

const Location = () => {
  const location = useLocation()
  return <output aria-label="当前路由">{location.pathname}</output>
}

const renderEditor = (mode: 'create' | 'edit', path?: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const route =
    mode === 'create' ? '/admin/articles/new' : '/admin/articles/:id/edit'
  const router = createMemoryRouter(
    [
      {
        path: route,
        element: (
          <>
            <ArticleEditorView mode={mode} />
            <Location />
          </>
        ),
      },
      ...(mode === 'create'
        ? [{ path: '/admin/articles/:id/edit', element: <Location /> }]
        : []),
      { path: '/admin/articles', element: <Location /> },
    ],
    {
      initialEntries: [
        path ??
          (mode === 'create'
            ? '/admin/articles/new'
            : '/admin/articles/7/edit'),
      ],
    },
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const fillValidForm = () => {
  fireEvent.change(screen.getByLabelText('标题'), {
    target: { value: '新文章' },
  })
  fireEvent.change(screen.getByLabelText('文章正文'), {
    target: { value: '正文内容' },
  })
}

describe('后台文章编辑页', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(getCategories).mockResolvedValue([])
    vi.mocked(getTags).mockResolvedValue([])
  })

  afterEach(() => {
    localStorage.clear()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('新建页默认字段为空且状态为草稿', () => {
    renderEditor('create')

    expect(screen.getByLabelText('标题')).toHaveValue('')
    expect(screen.getByLabelText('摘要')).toHaveValue('')
    expect(screen.getByRole('button', { name: '上传封面' })).toBeInTheDocument()
    expect(screen.queryByLabelText('封面 URL')).not.toBeInTheDocument()
    expect(screen.getByLabelText('文章正文')).toHaveValue('')
    expect(screen.getByRole('radio', { name: '草稿' })).toBeChecked()
    expect(
      screen.queryByRole('button', { name: '删除文章' }),
    ).not.toBeInTheDocument()
    expect(getArticleDetail).not.toHaveBeenCalled()
  })

  it('编辑页应请求详情并填充信息栏和正文', async () => {
    vi.mocked(getArticleDetail).mockResolvedValue(article)
    renderEditor('edit')

    expect(await screen.findByDisplayValue('已有文章')).toBeInTheDocument()
    expect(screen.getByLabelText('摘要')).toHaveValue('已有摘要')
    expect(screen.getByRole('img', { name: '已有文章' })).toHaveAttribute(
      'src',
      article.coverUrl,
    )
    expect(screen.queryByLabelText('封面 URL')).not.toBeInTheDocument()
    expect(screen.getByLabelText('文章正文')).toHaveValue('# 已有正文')
    expect(screen.getByRole('radio', { name: '已发布' })).toBeChecked()
    expect(getArticleDetail).toHaveBeenCalledWith(7)
  })

  it('编辑页 ID 非数字时应显示错误并提供返回入口', () => {
    renderEditor('edit', '/admin/articles/not-a-number/edit')

    expect(screen.getByRole('alert')).toHaveTextContent('文章 ID 无效')
    expect(
      screen.getByRole('button', { name: '返回文章列表' }),
    ).toBeInTheDocument()
    expect(getArticleDetail).not.toHaveBeenCalled()
  })

  it('标题为空时校验失败且不应发送保存请求', () => {
    renderEditor('create')
    fillValidForm()
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: '保存文章' }))

    expect(screen.getByText('标题不能为空')).toBeInTheDocument()
    expect(createArticle).not.toHaveBeenCalled()
  })

  it('标题和摘要没有前端字数上限且可以进入保存请求', async () => {
    vi.mocked(createArticle).mockImplementationOnce(
      () => new Promise(() => undefined),
    )
    renderEditor('create')
    fillValidForm()
    const longTitle = '标题'.repeat(100)
    const longSummary = '摘要'.repeat(200)
    fireEvent.change(screen.getByLabelText('标题'), {
      target: { value: longTitle },
    })
    fireEvent.change(screen.getByLabelText('摘要'), {
      target: { value: longSummary },
    })

    fireEvent.click(screen.getByRole('button', { name: '保存文章' }))

    await waitFor(() => expect(createArticle).toHaveBeenCalledOnce())
    expect(createArticle).toHaveBeenCalledWith(
      expect.objectContaining({ title: longTitle, summary: longSummary }),
    )
  })

  it('正文为空时不应发送保存请求', () => {
    renderEditor('create')
    fireEvent.change(screen.getByLabelText('标题'), {
      target: { value: '新文章' },
    })

    fireEvent.click(screen.getByRole('button', { name: '保存文章' }))

    expect(screen.getByText('正文不能为空')).toBeInTheDocument()
    expect(createArticle).not.toHaveBeenCalled()
  })

  it('新建成功后应进入文章编辑路由', async () => {
    vi.mocked(createArticle).mockResolvedValue({ id: 23 })
    renderEditor('create')
    fillValidForm()

    fireEvent.click(screen.getByRole('button', { name: '保存文章' }))

    await waitFor(() => expect(createArticle).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(screen.getByLabelText('当前路由')).toHaveTextContent(
        '/admin/articles/23/edit',
      ),
    )
  })

  it('保存请求进行中应禁用重复保存并阻止直接离开', async () => {
    vi.mocked(createArticle).mockReturnValue(new Promise(() => undefined))
    renderEditor('create')
    fillValidForm()

    fireEvent.click(screen.getByRole('button', { name: '保存文章' }))

    const savingButton = screen.getByRole('button', { name: '保存中' })
    expect(savingButton).toBeDisabled()
    expect(screen.getByText('保存状态：保存中')).toBeInTheDocument()
    await waitFor(() => expect(createArticle).toHaveBeenCalledTimes(1))
    fireEvent.click(savingButton)
    expect(createArticle).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '返回文章列表' }))
    expect(await screen.findByText('放弃文章变更')).toBeInTheDocument()
  })

  it('修改成功后应显示已保存', async () => {
    vi.mocked(getArticleDetail).mockResolvedValue(article)
    vi.mocked(updateArticle).mockResolvedValue({ ...article, title: '修改后' })
    renderEditor('edit')
    await screen.findByDisplayValue('已有文章')
    fireEvent.change(screen.getByLabelText('标题'), {
      target: { value: '修改后' },
    })

    fireEvent.click(screen.getByRole('button', { name: '保存文章' }))

    expect(await screen.findByText('保存状态：已保存')).toBeInTheDocument()
    await waitFor(() => expect(updateArticle).toHaveBeenCalledOnce())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.getByText('保存状态：已保存')).toBeInTheDocument()
    expect(updateArticle).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ title: '修改后' }),
    )
  })

  it('移除封面保存成功后应读取后端确认状态并显示暂无封面', async () => {
    // Given 当前文章存在已保存封面
    // When 管理员确认移除封面并保存文章
    // Then 封面删除完成后重新读取文章详情且当前页面显示暂无封面
    let coverRemoved = false
    vi.mocked(getArticleDetail).mockImplementation(async () =>
      coverRemoved ? { ...article, coverUrl: undefined } : article,
    )
    vi.mocked(updateArticle).mockResolvedValue(article)
    vi.mocked(removeArticleCover).mockImplementation(async () => {
      coverRemoved = true
    })
    renderEditor('edit')
    await screen.findByDisplayValue('已有文章')

    fireEvent.click(screen.getByRole('button', { name: '移除封面' }))
    fireEvent.click(await screen.findByRole('button', { name: '确认移除' }))
    fireEvent.click(screen.getByRole('button', { name: '保存文章' }))

    await waitFor(() => expect(removeArticleCover).toHaveBeenCalledWith(7))
    await waitFor(() => expect(getArticleDetail).toHaveBeenLastCalledWith(7))
    expect(screen.getAllByText('暂无封面')).not.toHaveLength(0)
    expect(screen.getByText('保存状态：已保存')).toBeInTheDocument()
  })

  it('保存失败时应显示后端 msg', async () => {
    vi.mocked(createArticle).mockRejectedValue({
      code: '500',
      message: '后端保存失败',
    })
    renderEditor('create')
    fillValidForm()

    fireEvent.click(screen.getByRole('button', { name: '保存文章' }))

    expect(await screen.findByText('后端保存失败')).toBeInTheDocument()
    expect(screen.getByText('保存状态：保存失败')).toBeInTheDocument()
  })

  it('每五分钟将未保存的新建文章写入本地草稿', () => {
    vi.useFakeTimers()
    renderEditor('create')
    fillValidForm()

    act(() => vi.advanceTimersByTime(5 * 60 * 1000 - 1))
    expect(readArticleEditorDraft(null)).toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(readArticleEditorDraft(null)).toMatchObject({
      form: { title: '新文章', content: '正文内容' },
    })
  })

  it('检测到编辑页本地草稿时，经确认恢复并标记为未保存', async () => {
    saveArticleEditorDraft(7, {
      ...emptyArticleForm,
      title: '本地恢复标题',
      content: '本地恢复正文',
    })
    vi.mocked(getArticleDetail).mockResolvedValue(article)
    renderEditor('edit')

    await screen.findByDisplayValue('已有文章')
    expect(await screen.findByText('恢复本地草稿')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '恢复草稿' }))

    expect(screen.getByLabelText('标题')).toHaveValue('本地恢复标题')
    expect(screen.getByLabelText('文章正文')).toHaveValue('本地恢复正文')
    expect(screen.getByText('保存状态：有未保存修改')).toBeInTheDocument()
  })

  it('检测到本地草稿时选择丢弃会删除缓存并保留服务器内容', async () => {
    saveArticleEditorDraft(7, {
      ...emptyArticleForm,
      title: '不应恢复的标题',
      content: '不应恢复的正文',
    })
    vi.mocked(getArticleDetail).mockResolvedValue(article)
    renderEditor('edit')

    await screen.findByDisplayValue('已有文章')
    await screen.findByText('恢复本地草稿')

    fireEvent.click(screen.getByRole('button', { name: '丢弃草稿' }))

    expect(readArticleEditorDraft(7)).toBeNull()
    expect(screen.getByLabelText('标题')).toHaveValue('已有文章')
    expect(screen.getByLabelText('文章正文')).toHaveValue('# 已有正文')
  })

  it('编辑页意外卸载时保留未保存字段供重新登录后恢复', () => {
    const rendered = renderEditor('create')
    fillValidForm()

    rendered.unmount()

    expect(readArticleEditorDraft(null)).toMatchObject({
      form: { title: '新文章', content: '正文内容' },
    })
  })

  it('手动保存成功后清除新建页本地草稿', async () => {
    vi.mocked(createArticle).mockResolvedValue({ id: 23 })
    vi.useFakeTimers()
    renderEditor('create')
    fillValidForm()
    act(() => vi.advanceTimersByTime(5 * 60 * 1000))
    expect(readArticleEditorDraft(null)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '保存文章' }))

    await act(async () => undefined)
    expect(createArticle).toHaveBeenCalledOnce()
    expect(readArticleEditorDraft(null)).toBeNull()
  })

  it('编辑页删除文章应确认并在成功后返回列表', async () => {
    vi.mocked(getArticleDetail).mockResolvedValue(article)
    vi.mocked(deleteArticle).mockResolvedValue(undefined)
    renderEditor('edit')
    await screen.findByDisplayValue('已有文章')

    fireEvent.click(screen.getByRole('button', { name: '删除文章' }))
    expect(
      await screen.findByText('确认删除“已有文章”吗？此操作无法撤销。'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: '删除文章' }).at(-1)!)

    await waitFor(() => expect(deleteArticle).toHaveBeenCalledWith(7))
    expect(screen.getByLabelText('当前路由')).toHaveTextContent(
      '/admin/articles',
    )
  })

  it('删除失败时应留在编辑页并显示后端 msg', async () => {
    vi.mocked(getArticleDetail).mockResolvedValue(article)
    vi.mocked(deleteArticle).mockRejectedValue({
      code: '500',
      message: '后端删除失败',
    })
    renderEditor('edit')
    await screen.findByDisplayValue('已有文章')
    fireEvent.click(screen.getByRole('button', { name: '删除文章' }))

    await screen.findByText('确认删除“已有文章”吗？此操作无法撤销。')

    fireEvent.click(screen.getAllByRole('button', { name: '删除文章' }).at(-1)!)

    expect(await screen.findByText('后端删除失败')).toBeInTheDocument()
    expect(screen.getByLabelText('当前路由')).toHaveTextContent(
      '/admin/articles/7/edit',
    )
  })

  it('Ctrl + S 应触发保存文章', async () => {
    vi.mocked(createArticle).mockResolvedValue({ id: 31 })
    renderEditor('create')
    fillValidForm()

    const allowed = fireEvent.keyDown(screen.getByLabelText('文章正文'), {
      key: 's',
      ctrlKey: true,
    })

    expect(allowed).toBe(false)
    await waitFor(() => expect(createArticle).toHaveBeenCalledOnce())
  })
})
