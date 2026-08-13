import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAdminCaptcha, login } from '@/api/auth'
import { useAdminAuthStore } from '@/store/auth'
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

const captcha = (overrides = {}) => ({
  captchaId: 'captcha-id-1',
  imageBase64: 'aW1hZ2UtYnl0ZXM=',
  ...overrides,
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

const fillCredentials = () => {
  fireEvent.change(screen.getByLabelText('用户名'), {
    target: { value: 'admin' },
  })
  fireEvent.change(screen.getByLabelText('密码'), {
    target: { value: 'secret' },
  })
}

describe('后台登录页验证码防护', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAdminAuthStore.getState().clearAuth()
  })

  it('打开登录页时应领取并展示验证码', async () => {
    // Given 管理员打开后台登录页
    vi.mocked(getAdminCaptcha).mockResolvedValue(captcha())

    // When 页面完成首次加载
    renderLoginView()

    // Then 页面请求验证码并用 PNG Base64 图片展示返回的 captchaId 对应验证码
    await waitFor(() => {
      expect(getAdminCaptcha).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByRole('img', { name: '验证码图片' })).toHaveAttribute(
      'src',
      'data:image/png;base64,aW1hZ2UtYnl0ZXM=',
    )
  })

  it('验证码不可用或为空时不应提交登录', async () => {
    // Given 验证码领取失败，或管理员没有输入验证码
    vi.mocked(getAdminCaptcha).mockRejectedValue({
      code: '400',
      message: '验证码发放率超过20次，1分钟内请稍后再试',
    })
    renderLoginView()

    // When 管理员尝试提交登录表单
    await screen.findByText('验证码发放率超过20次，1分钟内请稍后再试')

    // Then 页面不发送登录请求并展示可处理的提示
    expect(screen.getByRole('button', { name: '登录后台' })).toBeDisabled()
    expect(login).not.toHaveBeenCalled()
  })

  it('提交时应携带真实的验证码字段', async () => {
    // Given 管理员已经获得验证码并填写完整登录信息
    vi.mocked(getAdminCaptcha).mockResolvedValue(captcha())
    vi.mocked(login).mockResolvedValue(adminVO())
    renderLoginView()
    await screen.findByRole('img', { name: '验证码图片' })
    fillCredentials()
    fireEvent.change(screen.getByLabelText('验证码'), {
      target: { value: 'a2b3' },
    })

    // When 管理员提交登录表单
    fireEvent.click(screen.getByRole('button', { name: '登录后台' }))

    // Then 请求使用后端实际字段 captchaID 和 captchaCode 连同用户名、密码一起发送
    await screen.findByText('后台首页测试落点')
    expect(login).toHaveBeenCalledWith({
      username: 'admin',
      password: 'secret',
      captchaID: 'captcha-id-1',
      captchaCode: 'a2b3',
    })
  })

  it('主动刷新时应废弃旧验证码并清空输入', async () => {
    // Given 页面已经显示一张可用验证码且管理员输入过验证码字符
    vi.mocked(getAdminCaptcha)
      .mockResolvedValueOnce(captcha())
      .mockResolvedValueOnce(
        captcha({
          captchaId: 'captcha-id-2',
          imageBase64: 'bmV3LWltYWdlLWJ5dGVz',
        }),
      )
    renderLoginView()
    await screen.findByRole('img', { name: '验证码图片' })
    const captchaInput = screen.getByLabelText('验证码')
    fireEvent.change(captchaInput, { target: { value: 'a2b3' } })

    // When 管理员主动刷新验证码
    fireEvent.click(screen.getByRole('button', { name: '刷新验证码' }))

    // Then 页面清空输入和旧 captchaId 并领取、展示新的验证码
    expect(captchaInput).toHaveValue('')
    await waitFor(() => {
      expect(getAdminCaptcha).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByRole('img', { name: '验证码图片' })).toHaveAttribute(
      'src',
      'data:image/png;base64,bmV3LWltYWdlLWJ5dGVz',
    )
  })

  it('登录失败后应刷新验证码并清空输入', async () => {
    // Given 管理员提交过一张验证码但登录接口返回失败
    vi.mocked(getAdminCaptcha)
      .mockResolvedValueOnce(captcha())
      .mockResolvedValueOnce(captcha({ captchaId: 'captcha-id-2' }))
    vi.mocked(login).mockRejectedValue({
      code: '400',
      message: '用户名或密码错误',
    })
    renderLoginView()
    await screen.findByRole('img', { name: '验证码图片' })
    fillCredentials()
    const captchaInput = screen.getByLabelText('验证码')
    fireEvent.change(captchaInput, { target: { value: 'a2b3' } })

    // When 页面展示登录失败信息
    fireEvent.click(screen.getByRole('button', { name: '登录后台' }))
    await screen.findByText('用户名或密码错误')

    // Then 页面清空验证码输入并重新领取验证码以避免重复使用已消费验证码
    expect(captchaInput).toHaveValue('')
    await waitFor(() => {
      expect(getAdminCaptcha).toHaveBeenCalledTimes(2)
    })
  })

  it('验证码图片加载失败时应保留刷新入口并阻止登录', async () => {
    // Given 验证码接口返回的图片无法加载
    vi.mocked(getAdminCaptcha).mockResolvedValue(captcha())
    renderLoginView()
    const captchaImage = await screen.findByRole('img', { name: '验证码图片' })

    // When 图片加载失败状态出现
    fireEvent.error(captchaImage)

    // Then 页面提供刷新入口且保持登录提交不可用
    expect(
      await screen.findByText('验证码图片加载失败，请重新加载'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '刷新验证码' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '登录后台' })).toBeDisabled()
  })
})
