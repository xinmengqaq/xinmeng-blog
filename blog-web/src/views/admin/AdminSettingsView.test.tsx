import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  changeAdminPassword,
  getAdminProfile,
  refreshAdminToken,
  updateAdminProfile,
  validateAdminToken,
} from '@/api/admin'
import { useAuthStore } from '@/store/auth'
import type { AdminVO } from '@/types/auth'

import { AdminSettingsView } from './AdminSettingsView'

vi.mock('@/api/admin', () => ({
  changeAdminPassword: vi.fn(),
  getAdminProfile: vi.fn(),
  refreshAdminToken: vi.fn(),
  updateAdminProfile: vi.fn(),
  validateAdminToken: vi.fn(),
}))

vi.mock('./admin-settings/AdminAvatarEditor', () => ({
  AdminAvatarEditor: () => <div data-testid="admin-avatar-editor" />,
}))

const adminVO = (overrides: Partial<AdminVO> = {}): AdminVO => ({
  id: 1,
  username: 'admin',
  name: '梦梦',
  role: 'admin',
  avatar: '/files/avatar.png',
  ...overrides,
})

const renderSettingsView = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/settings/admin']}>
        <Routes>
          <Route path="/admin/settings/admin" element={<AdminSettingsView />} />
          <Route path="/admin/login" element={<div>登录页测试落点</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('管理员设置页', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  it('保存文字资料成功后应更新 currentUser', async () => {
    useAuthStore.getState().setAuth('old-token', adminVO())
    vi.mocked(getAdminProfile).mockResolvedValue(adminVO())
    vi.mocked(updateAdminProfile).mockResolvedValue(
      adminVO({
        username: 'xinmengqaq',
        name: '新梦梦',
      }),
    )
    renderSettingsView()

    const nameInput = await screen.findByDisplayValue('梦梦')

    fireEvent.change(screen.getByLabelText(/用户名/), {
      target: { value: 'xinmengqaq' },
    })
    fireEvent.change(nameInput, { target: { value: '新梦梦' } })
    fireEvent.click(screen.getByRole('button', { name: '保存资料' }))

    await screen.findByText('资料已保存')

    expect(updateAdminProfile).toHaveBeenCalledWith({
      username: 'xinmengqaq',
      name: '新梦梦',
    })
    expect(useAuthStore.getState().currentUser).toMatchObject({
      username: 'xinmengqaq',
      name: '新梦梦',
      avatar: '/files/avatar.png',
    })
  })

  it('管理员资料区不显示头像地址输入', async () => {
    useAuthStore.getState().setAuth('old-token', adminVO({ avatar: null }))
    vi.mocked(getAdminProfile).mockResolvedValue(adminVO({ avatar: null }))
    renderSettingsView()

    await screen.findByDisplayValue('梦梦')

    expect(screen.getByTestId('admin-avatar-editor')).toBeInTheDocument()
    expect(screen.queryByLabelText('头像地址')).not.toBeInTheDocument()
  })

  it('修改密码成功后应清理登录态并跳转 /admin/login', async () => {
    useAuthStore.getState().setAuth('old-token', adminVO())
    vi.mocked(getAdminProfile).mockResolvedValue(adminVO())
    vi.mocked(changeAdminPassword).mockResolvedValue(undefined)
    renderSettingsView()

    await screen.findByDisplayValue('梦梦')

    fireEvent.change(screen.getByLabelText(/旧密码/), {
      target: { value: 'old-pass' },
    })
    fireEvent.change(screen.getByLabelText(/新密码/), {
      target: { value: 'new-pass' },
    })
    fireEvent.click(screen.getByRole('button', { name: '修改密码' }))

    await screen.findByText('登录页测试落点')

    expect(changeAdminPassword).toHaveBeenCalledWith({
      oldPassword: 'old-pass',
      newPassword: 'new-pass',
    })
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('校验 Token 成功后应显示有效', async () => {
    useAuthStore.getState().setAuth('old-token', adminVO())
    vi.mocked(getAdminProfile).mockResolvedValue(adminVO())
    vi.mocked(validateAdminToken).mockResolvedValue({ valid: true })
    renderSettingsView()

    await screen.findByDisplayValue('梦梦')

    fireEvent.click(screen.getByRole('button', { name: '校验 Token' }))

    await waitFor(() => {
      expect(screen.getAllByText('有效').length).toBeGreaterThan(0)
    })
  })

  it('刷新 Token 成功后应只更新 token 不改 currentUser', async () => {
    const currentUser = adminVO()
    useAuthStore.getState().setAuth('old-token', currentUser)
    vi.mocked(getAdminProfile).mockResolvedValue(currentUser)
    vi.mocked(refreshAdminToken).mockResolvedValue({ token: 'new-token' })
    renderSettingsView()

    await screen.findByDisplayValue('梦梦')

    fireEvent.click(screen.getByRole('button', { name: '刷新 Token' }))

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe('new-token')
    })
    expect(useAuthStore.getState().currentUser).toEqual({
      id: 1,
      username: 'admin',
      name: '梦梦',
      role: 'admin',
      avatar: '/files/avatar.png',
    })
    expect(screen.getAllByText('已刷新').length).toBeGreaterThan(0)
  })

  it('Token 校验或刷新遇到 401 后应清理登录态', async () => {
    useAuthStore.getState().setAuth('old-token', adminVO())
    vi.mocked(getAdminProfile).mockResolvedValue(adminVO())
    vi.mocked(validateAdminToken).mockRejectedValue({
      code: '401',
      message: '登录已失效，请重新登录',
    })
    renderSettingsView()

    await screen.findByDisplayValue('梦梦')

    fireEvent.click(screen.getByRole('button', { name: '校验 Token' }))

    await screen.findByText('登录页测试落点')

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
