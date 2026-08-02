import { describe, expect, it } from 'vitest'

import { getAuthRedirect } from './guardUtils'

describe('getAuthRedirect', () => {
  it('未登录访问 /admin/settings/admin 时应跳转 /admin/login', () => {
    expect(
      getAuthRedirect({
        isAuthenticated: false,
        requiresAuth: true,
        pathname: '/admin/settings/admin',
      }),
    ).toBe('/admin/login')
  })

  it('未登录访问文章管理页时应跳转后台登录页', () => {
    expect(
      getAuthRedirect({
        isAuthenticated: false,
        requiresAuth: true,
        pathname: '/admin/articles',
      }),
    ).toBe('/admin/login')
  })

  it('已登录访问 /admin/login 时应跳转 /admin', () => {
    expect(
      getAuthRedirect({
        isAuthenticated: true,
        guestOnly: true,
        pathname: '/admin/login',
      }),
    ).toBe('/admin')
  })

  it('公开页面不跳转', () => {
    expect(
      getAuthRedirect({ isAuthenticated: false, pathname: '/' }),
    ).toBeNull()
  })
})
