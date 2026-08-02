import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { deleteArticle, getArticlePage } from '@/api/article'
import type { PageResult } from '@/types/api'
import type { ArticleVO } from '@/types/article'

import { ArticleListView } from './ArticleListView'

vi.mock('@/api/article', () => ({
  createArticle: vi.fn(),
  deleteArticle: vi.fn(),
  getArticleDetail: vi.fn(),
  getArticlePage: vi.fn(),
  updateArticle: vi.fn(),
}))

const article: ArticleVO = {
  id: 7,
  title: '块状 Markdown 编辑器设计',
  summary: '一篇用于验证后台文章列表的测试文章。',
  content: '# 正文',
  coverUrl: 'https://example.com/cover.png',
  status: 'published',
  viewCount: 32,
  commentCount: 4,
  publishedAt: '2026-07-09T08:00:00Z',
  createdAt: '2026-07-09T08:00:00Z',
  updatedAt: '2026-07-10T08:00:00Z',
}

const pageResult = (
  list: ArticleVO[] = [article],
  overrides: Partial<PageResult<ArticleVO>> = {},
): PageResult<ArticleVO> => ({
  page: 1,
  size: 10,
  total: list.length,
  pages: list.length ? 1 : 0,
  list,
  ...overrides,
})

const renderListView = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/articles']}>
        <Routes>
          <Route path="/admin/articles" element={<ArticleListView />} />
          <Route path="/admin/articles/new" element={<div>新建文章页</div>} />
          <Route
            path="/admin/articles/:id/edit"
            element={<div>编辑文章页</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('后台文章列表页', () => {
  afterEach(() => vi.clearAllMocks())

  it('首次进入文章列表页时应显示加载状态', () => {
    vi.mocked(getArticlePage).mockReturnValue(new Promise(() => undefined))
    renderListView()

    expect(screen.getByText('正在加载文章列表。')).toBeInTheDocument()
  })

  it('加载成功后应显示横向文章卡片', async () => {
    vi.mocked(getArticlePage).mockResolvedValue(pageResult())
    renderListView()

    expect(await screen.findByText(article.title)).toBeInTheDocument()
    expect(screen.getByText(article.summary!)).toBeInTheDocument()
    expect(screen.getAllByText('已发布')).toHaveLength(2)
    expect(screen.getByText('阅读 32')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `编辑 ${article.title}` }),
    ).toBeInTheDocument()
  })

  it('列表为空时应显示还没有文章并提供新建入口', async () => {
    vi.mocked(getArticlePage).mockResolvedValue(pageResult([]))
    renderListView()

    expect(await screen.findByText('还没有文章')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '新建文章' })).toHaveLength(2)
  })

  it('筛选无结果时应显示没有找到符合条件的文章并提供重置入口', async () => {
    vi.mocked(getArticlePage)
      .mockResolvedValueOnce(pageResult())
      .mockResolvedValueOnce(pageResult([]))
    renderListView()

    await screen.findByText(article.title)
    fireEvent.change(screen.getByLabelText('关键词'), {
      target: { value: '不存在' },
    })
    fireEvent.click(screen.getByRole('button', { name: '查询' }))

    expect(
      await screen.findByText('没有找到符合条件的文章'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重置筛选' })).toBeInTheDocument()
  })

  it('关键词超过 50 字符时不应发送查询请求', async () => {
    vi.mocked(getArticlePage).mockResolvedValue(pageResult())
    renderListView()

    await screen.findByText(article.title)
    fireEvent.change(screen.getByLabelText('关键词'), {
      target: { value: '长'.repeat(51) },
    })
    fireEvent.click(screen.getByRole('button', { name: '查询' }))

    expect(screen.getByText('关键词最多 50 个字符')).toBeInTheDocument()
    expect(getArticlePage).toHaveBeenCalledTimes(1)
  })

  it('点击查询时应使用当前关键词和状态请求第一页', async () => {
    vi.mocked(getArticlePage).mockResolvedValue(pageResult())
    renderListView()

    await screen.findByText(article.title)
    fireEvent.change(screen.getByLabelText('关键词'), {
      target: { value: ' 编辑器 ' },
    })
    fireEvent.change(screen.getByLabelText('状态'), {
      target: { value: 'draft' },
    })
    fireEvent.click(screen.getByRole('button', { name: '查询' }))

    await waitFor(() => {
      expect(getArticlePage).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        keyword: '编辑器',
        status: 'draft',
      })
    })
  })

  it('点击重置时应清空关键词和状态并回到第一页', async () => {
    vi.mocked(getArticlePage).mockResolvedValue(pageResult())
    renderListView()

    await screen.findByText(article.title)
    fireEvent.change(screen.getByLabelText('关键词'), {
      target: { value: '编辑器' },
    })
    fireEvent.change(screen.getByLabelText('状态'), {
      target: { value: 'hidden' },
    })
    fireEvent.click(screen.getByRole('button', { name: '重置' }))

    expect(screen.getByLabelText('关键词')).toHaveValue('')
    expect(screen.getByLabelText('状态')).toHaveValue('')
  })

  it('点击新建文章时应进入 /admin/articles/new', async () => {
    vi.mocked(getArticlePage).mockResolvedValue(pageResult())
    renderListView()

    await screen.findByText(article.title)
    fireEvent.click(screen.getByRole('button', { name: '新建文章' }))
    expect(screen.getByText('新建文章页')).toBeInTheDocument()
  })

  it('点击编辑时应进入 /admin/articles/:id/edit', async () => {
    vi.mocked(getArticlePage).mockResolvedValue(pageResult())
    renderListView()

    fireEvent.click(
      await screen.findByRole('button', { name: `编辑 ${article.title}` }),
    )
    expect(screen.getByText('编辑文章页')).toBeInTheDocument()
  })

  it('点击删除时应打开确认弹窗并显示文章标题', async () => {
    vi.mocked(getArticlePage).mockResolvedValue(pageResult())
    renderListView()

    fireEvent.click(
      await screen.findByRole('button', { name: `删除 ${article.title}` }),
    )
    expect(
      screen.getByRole('heading', { name: '删除文章' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveTextContent(article.title)
  })

  it('删除失败时应显示后端 msg', async () => {
    vi.mocked(getArticlePage).mockResolvedValue(pageResult())
    vi.mocked(deleteArticle).mockRejectedValue({
      code: 'DELETE_FAILED',
      message: '文章删除失败',
    })
    renderListView()

    fireEvent.click(
      await screen.findByRole('button', { name: `删除 ${article.title}` }),
    )
    fireEvent.click(screen.getByRole('button', { name: '删除文章' }))

    expect(await screen.findByText('文章删除失败')).toBeInTheDocument()
    expect(screen.getByText(article.title)).toBeInTheDocument()
  })
})
