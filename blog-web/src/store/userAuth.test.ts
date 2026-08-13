import { afterEach, describe, expect, it } from 'vitest'

import { useAdminAuthStore } from './auth'
import { useUserAuthStore } from './userAuth'

describe('useUserAuthStore', () => {
  afterEach(() => {
    localStorage.clear()
    useAdminAuthStore.getState().clearAuth()
    useUserAuthStore.getState().clearAuth()
  })

  it('普通用户身份使用独立存储键并与管理员身份互不影响', () => {
    // Given 管理员身份已经保存在浏览器中
    useAdminAuthStore.getState().setAuth('admin-token', {
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'admin',
    })
    // When 普通用户登录、刷新身份或清理普通用户身份
    useUserAuthStore.getState().setAuth('user-token', {
      id: 2,
      email: 'user@example.com',
      nickname: '普通用户',
      avatar: null,
    })
    // Then 普通用户只读写自己的存储键
    expect(localStorage.getItem('blog-web:user-token')).toBe(
      JSON.stringify('user-token'),
    )
    expect(localStorage.getItem('blog-web:user-profile')).toContain(
      'user@example.com',
    )
    // Then 管理员身份和管理员存储内容保持不变
    useUserAuthStore.getState().clearAuth()
    expect(useAdminAuthStore.getState().token).toBe('admin-token')
    expect(localStorage.getItem('blog-web:token')).toBe(
      JSON.stringify('admin-token'),
    )
  })

  it('普通用户可从独立存储键恢复并单独更新资料和 Token', () => {
    localStorage.setItem('blog-web:user-token', JSON.stringify('stored-token'))
    localStorage.setItem(
      'blog-web:user-profile',
      JSON.stringify({
        id: 2,
        email: 'user@example.com',
        nickname: '旧昵称',
        avatar: null,
      }),
    )

    useUserAuthStore.getState().hydrateAuth()
    useUserAuthStore.getState().setToken('new-token')
    useUserAuthStore.getState().setCurrentUser({
      id: 2,
      email: 'user@example.com',
      nickname: '新昵称',
      avatar: '/files/avatar.webp',
    })

    expect(useUserAuthStore.getState()).toMatchObject({
      token: 'new-token',
      currentUser: {
        nickname: '新昵称',
        avatar: '/files/avatar.webp',
      },
      isAuthenticated: true,
    })
  })
})
