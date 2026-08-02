import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAdminCaptcha, login } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import type { AdminVO } from '@/types/auth'

import { LoginView } from './LoginView'

vi.mock('@/api/auth', () => ({
  getAdminCaptcha: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}))

const adminVO = (overrides: Partial<AdminVO> = {}): AdminVO => ({
  id: 1,
  username: 'admin',
  name: '梦梦',
  role: 'admin',
  avatar: '/files/avatar.png',
  token: 'token-1',
  ...overrides,
})

const captcha = () => ({
  captchaId: 'captcha-id-1',
  imageBase64: 'aW1hZ2UtYnl0ZXM=',
})

const renderLoginView = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<LoginView />} />
          <Route path="/admin" element={<div>后台首页测试落点</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('后台登录页', () => {
  beforeEach(() => {
    vi.mocked(getAdminCaptcha).mockResolvedValue(captcha())
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  const fillLoginForm = async (password: string) => {
    await screen.findByRole('img', { name: '验证码图片' })
    fireEvent.change(screen.getByLabelText('用户名'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: password },
    })
    fireEvent.change(screen.getByLabelText('验证码'), {
      target: { value: 'a2b3' },
    })
  }

  it('后台登录成功后应保存 Token 和管理员资料并跳转 /admin', async () => {
    vi.mocked(login).mockResolvedValue(adminVO())
    renderLoginView()
    await fillLoginForm('secret')
    fireEvent.click(screen.getByRole('button', { name: '登录后台' }))

    await screen.findByText('后台首页测试落点')

    expect(login).toHaveBeenCalledWith({
      username: 'admin',
      password: 'secret',
      captchaID: 'captcha-id-1',
      captchaCode: 'a2b3',
    })
    expect(useAuthStore.getState().token).toBe('token-1')
    expect(useAuthStore.getState().currentUser).toMatchObject({
      username: 'admin',
      name: '梦梦',
      role: 'admin',
    })
  })

  it('后台登录必填校验失败时不应发送请求', async () => {
    renderLoginView()
    await screen.findByRole('img', { name: '验证码图片' })

    fireEvent.click(screen.getByRole('button', { name: '登录后台' }))

    expect(screen.getByText('用户名不能为空')).toBeInTheDocument()
    expect(screen.getByText('密码不能为空')).toBeInTheDocument()
    expect(screen.getByText('验证码不能为空')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('后台登录业务失败时应显示后端 msg', async () => {
    vi.mocked(login).mockRejectedValue({
      code: '400',
      message: '用户名或密码错误',
    })
    renderLoginView()
    await fillLoginForm('bad-pass')
    fireEvent.click(screen.getByRole('button', { name: '登录后台' }))

    await screen.findByText('用户名或密码错误')
  })

  it('后台登录网络失败时应显示无法连接后端服务', async () => {
    vi.mocked(login).mockRejectedValue({
      code: 'NETWORK_ERROR',
      message: '无法连接后端服务，请确认服务是否已启动',
    })
    renderLoginView()
    await fillLoginForm('secret')
    fireEvent.click(screen.getByRole('button', { name: '登录后台' }))

    await waitFor(() => {
      expect(
        screen.getByText('无法连接后端服务，请确认服务是否已启动'),
      ).toBeInTheDocument()
    })
  })
})
