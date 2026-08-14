import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getArticleDetail, updateArticle } from '@/api/article'
import { getCategories, getTags } from '@/api/taxonomy'
import type { ArticleVO } from '@/types/article'

import { ArticleEditorView } from './ArticleEditorView'

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

const article: ArticleVO = {
  id: 7,
  title: '已有文章',
  summary: '已有摘要',
  content: '原始正文',
  status: 'published',
  viewCount: 3,
  commentCount: 1,
  createdAt: '2026-07-09T08:00:00Z',
  updatedAt: '2026-07-10T08:00:00Z',
}

const renderEditor = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const router = createMemoryRouter(
    [
      {
        path: '/admin/articles/:id/edit',
        element: <ArticleEditorView mode="edit" />,
      },
    ],
    { initialEntries: ['/admin/articles/7/edit'] },
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('后台文章编辑页真实编辑器集成', () => {
  beforeEach(() => {
    vi.mocked(getCategories).mockResolvedValue([])
    vi.mocked(getTags).mockResolvedValue([])
  })

  afterEach(() => vi.clearAllMocks())

  it('真实正文输入应序列化保存并在失焦后显示服务端回写正文', async () => {
    const normalized = {
      ...article,
      content: '修改后的 **正文**\n\n服务端规范化',
    }
    vi.mocked(getArticleDetail)
      .mockResolvedValueOnce(article)
      .mockResolvedValue(normalized)
    vi.mocked(updateArticle).mockResolvedValue(normalized)
    renderEditor()
    const editable = await screen.findByText('原始正文')
    editable.focus()
    editable.innerHTML = '修改后的 <strong>正文</strong>'
    fireEvent.input(editable)

    const allowed = fireEvent.keyDown(editable, { key: 's', ctrlKey: true })

    expect(allowed).toBe(false)
    await waitFor(() =>
      expect(updateArticle).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ content: '修改后的 **正文**' }),
      ),
    )
    expect(editable).toHaveTextContent('修改后的 正文')

    screen.getByLabelText('标题').focus()

    expect(await screen.findByText('服务端规范化')).toBeInTheDocument()
  })
})
