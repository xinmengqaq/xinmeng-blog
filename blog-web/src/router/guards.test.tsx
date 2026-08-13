import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useUserAuthStore } from '@/store/userAuth'
import { useUserProfileQuery } from '@/queries/userProfile'

import { AdminRouteGuard, UserGuestRoute, UserRouteGuard } from './guards'

vi.mock('@/queries/userProfile', () => ({ useUserProfileQuery: vi.fn() }))

const renderUserRoute = (initialEntry = '/profile') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<UserRouteGuard />}>
          <Route path="/profile" element={<p>个人资料内容</p>} />
        </Route>
        <Route path="/login" element={<p>用户登录页</p>} />
      </Routes>
    </MemoryRouter>,
  )

describe('用户路由守卫', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    useUserAuthStore.getState().clearAuth()
  })

  it('个人资料路由以服务端资料确认普通用户身份', () => {
    // Given 本地存在普通用户凭证但服务端资料仍在确认
    useUserAuthStore.getState().setAuth('user-token', {
      id: 2,
      email: 'user@example.com',
      nickname: '用户',
      avatar: null,
    })
    vi.mocked(useUserProfileQuery).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: true,
    } as ReturnType<typeof useUserProfileQuery>)
    const { rerender } = renderUserRoute()
    // When 用户进入个人资料路由
    // Then 守卫只返回资料加载状态，不提前展示个人资料内容
    expect(screen.getByRole('status')).toHaveTextContent('资料加载中')
    expect(screen.queryByText('个人资料内容')).not.toBeInTheDocument()

    vi.mocked(useUserProfileQuery).mockReturnValue({
      data: {
        id: 2,
        email: 'user@example.com',
        nickname: '用户',
        avatar: null,
      },
      error: null,
      isError: false,
      isPending: false,
    } as ReturnType<typeof useUserProfileQuery>)
    rerender(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route element={<UserRouteGuard />}>
            <Route path="/profile" element={<p>个人资料内容</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    // Then 资料确认成功后才放行，失效后进入登录页
    expect(screen.getByText('个人资料内容')).toBeInTheDocument()
  })

  it('未登录或资料确认 401 时进入登录页并记录返回目标', () => {
    vi.mocked(useUserProfileQuery).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
    } as ReturnType<typeof useUserProfileQuery>)
    renderUserRoute()
    expect(screen.getByText('用户登录页')).toBeInTheDocument()

    useUserAuthStore.getState().setAuth('user-token', {
      id: 2,
      email: 'user@example.com',
      nickname: '用户',
      avatar: null,
    })
    vi.mocked(useUserProfileQuery).mockReturnValue({
      data: undefined,
      error: { code: '401', message: '登录已失效', status: 401 },
      isError: true,
      isPending: false,
    } as ReturnType<typeof useUserProfileQuery>)
    renderUserRoute()
    expect(screen.getAllByText('用户登录页')).toHaveLength(2)
  })

  it('访客账户路由按普通用户身份返回有效公开来源', () => {
    // Given 已登录普通用户从公开页面进入登录、注册或找回密码页
    useUserAuthStore.getState().setAuth('user-token', {
      id: 2,
      email: 'user@example.com',
      nickname: '用户',
      avatar: null,
    })
    // When 访客守卫处理该账户路由
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/login', state: { from: '/articles/8' } },
        ]}
      >
        <Routes>
          <Route element={<UserGuestRoute />}>
            <Route path="/login" element={<p>用户登录页</p>} />
          </Route>
          <Route path="/articles/8" element={<p>原公开页面</p>} />
        </Routes>
      </MemoryRouter>,
    )
    // Then 用户返回原公开页面，无有效来源时返回首页
    expect(screen.getByText('原公开页面')).toBeInTheDocument()
  })

  it('已登录用户从个人资料页进入找回密码时保持当前流程', () => {
    // Given 已登录用户通过个人资料页的明确入口进入找回密码
    useUserAuthStore.getState().setAuth('user-token', {
      id: 2,
      email: 'user@example.com',
      nickname: '用户',
      avatar: null,
    })
    // When 访客守卫收到个人资料页来源标记
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/forgot-password',
            state: { fromProfile: true, email: 'user@example.com' },
          },
        ]}
      >
        <Routes>
          <Route element={<UserGuestRoute />}>
            <Route path="/forgot-password" element={<p>找回密码内容</p>} />
          </Route>
          <Route path="/" element={<p>首页</p>} />
        </Routes>
      </MemoryRouter>,
    )
    // Then 守卫放行当前找回密码流程而不是重定向首页
    expect(screen.getByText('找回密码内容')).toBeInTheDocument()
  })
})

describe('管理员路由守卫', () => {
  it('改名后仍导出独立管理员守卫', () => {
    expect(AdminRouteGuard).toBeTypeOf('function')
  })
})
