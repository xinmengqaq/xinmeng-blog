import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AdminSidebar } from './AdminSidebar'

describe('AdminSidebar', () => {
  it('展示文章管理入口并在文章路由下保持选中', () => {
    render(
      <MemoryRouter initialEntries={['/admin/articles']}>
        <AdminSidebar />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: '后台首页' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '管理员设置' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '文章管理' })).toHaveAttribute(
      'href',
      '/admin/articles',
    )
    expect(screen.getByRole('link', { name: '文章管理' })).toHaveClass(
      'admin-nav-item--active',
    )
  })
})
