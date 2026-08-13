import { afterEach, describe, expect, it } from 'vitest'

import {
  consumeUserLoginRedirect,
  getAdminAuthRedirect,
  getSafeUserReturnTarget,
  getUserLoginSuccessTarget,
  getUserGuestRedirect,
  recordUserLoginRedirect,
} from './guardUtils'

describe('路由守卫导航工具', () => {
  it('登录结果只使用安全来源且无来源时返回首页', () => {
    // Given 登录来源可能是公开页面、账户页面或外部地址
    // When 普通用户登录成功选择返回目标
    // Then 只返回有效站内来源，其他情况返回首页
    expect(getUserLoginSuccessTarget('/articles/8')).toBe('/articles/8')
    expect(getUserLoginSuccessTarget('/login')).toBe('/')
    expect(getUserLoginSuccessTarget('https://evil.example')).toBe('/')
    expect(getUserLoginSuccessTarget(null)).toBe('/')
  })

  afterEach(() => sessionStorage.clear())

  it('管理员守卫改名后保持现有重定向行为', () => {
    // Given 管理员处于已登录或未登录状态
    // When 管理员访问受保护页面或后台登录页
    // Then 守卫继续按原规则在后台登录页和后台首页之间重定向
    expect(
      getAdminAuthRedirect({
        isAuthenticated: false,
        requiresAuth: true,
        pathname: '/admin/articles',
      }),
    ).toBe('/admin/login')
    expect(
      getAdminAuthRedirect({
        isAuthenticated: true,
        guestOnly: true,
        pathname: '/admin/login',
      }),
    ).toBe('/admin')
    expect(
      getAdminAuthRedirect({ isAuthenticated: false, pathname: '/' }),
    ).toBeNull()
  })

  it('只保留有效返回目标并排除账户页面', () => {
    // Given 返回来源可能是公开页面、个人资料页或访客账户页
    // When 守卫记录或读取普通用户登录返回目标
    // Then 只保留站内有效路径
    expect(getSafeUserReturnTarget('/articles/8?from=home#comments')).toBe(
      '/articles/8?from=home#comments',
    )
    expect(getSafeUserReturnTarget('/profile')).toBe('/profile')
    expect(getSafeUserReturnTarget('https://evil.example')).toBeNull()
    expect(getSafeUserReturnTarget('//evil.example')).toBeNull()
    // Then 登录、注册和找回密码不能成为返回目标
    expect(getSafeUserReturnTarget('/login')).toBeNull()
    expect(getSafeUserReturnTarget('/register?from=/articles')).toBeNull()
    expect(getSafeUserReturnTarget('/forgot-password')).toBeNull()
    expect(getUserGuestRedirect(true, '/articles/8')).toBe('/articles/8')
    expect(getUserGuestRedirect(true, '/login')).toBe('/')
    expect(getUserGuestRedirect(false, '/articles/8')).toBeNull()
    expect(getUserGuestRedirect(true, null, true)).toBeNull()
  })

  it('普通用户失效时记录一次性提示且不记录敏感请求', () => {
    // Given 受保护资料请求返回普通用户登录失效
    // When 用户守卫准备跳转登录页
    recordUserLoginRedirect('/profile', '登录已失效，请重新登录')
    // Then 只记录有效返回目标和登录失效提示
    expect(consumeUserLoginRedirect()).toEqual({
      message: '登录已失效，请重新登录',
      returnTo: '/profile',
    })
    // Then 不保存请求载荷且提示被读取后立即删除
    expect(consumeUserLoginRedirect()).toBeNull()
    expect(JSON.stringify(sessionStorage)).not.toContain('password')
  })
})
