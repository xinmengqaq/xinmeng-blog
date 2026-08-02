import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AdminTopbar } from './AdminTopbar'

vi.mock('@/api/auth', () => ({
  logout: vi.fn(),
}))

const renderTopbar = (
  avatar: string | null = null,
  initialEntry = '/admin',
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AdminTopbar
          currentUser={{
            id: 1,
            username: 'admin',
            name: '管理员',
            role: '管理员',
            avatar,
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminTopbar', () => {
  it('头像为空时显示默认灰色头像容器', () => {
    renderTopbar(null)

    const avatar = screen.getByLabelText('当前管理员头像')

    expect(avatar).toBeInTheDocument()
    expect(avatar.querySelector('img')).toBeNull()
  })

  it('头像有地址时显示头像图片而不是图标', () => {
    renderTopbar('https://example.com/avatar.png')

    const avatar = screen.getByLabelText('当前管理员头像')

    expect(avatar.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/avatar.png',
    )
  })

  it('文章路由应显示文章管理上下文', () => {
    renderTopbar(null, '/admin/articles/7/edit')

    expect(screen.getByText('文章管理')).toBeInTheDocument()
  })
})
