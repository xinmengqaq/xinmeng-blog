import { afterEach, describe, expect, it } from 'vitest'

import { storage } from '@/utils/storage'

import { useAdminAuthStore } from './auth'

describe('useAdminAuthStore', () => {
  it('管理员身份迁移后继续兼容现有存储键', () => {
    // Given 浏览器已有管理员 Token 和管理员资料
    localStorage.setItem('blog-web:token', JSON.stringify('legacy-token'))
    localStorage.setItem(
      'blog-web:user',
      JSON.stringify({
        id: 1,
        username: 'admin',
        name: '管理员',
        role: 'admin',
      }),
    )
    // When 管理员身份 Store 读取并更新登录态
    useAdminAuthStore.getState().hydrateAuth()
    // Then Store 继续使用现有管理员存储键且保持原有登录行为
    expect(useAdminAuthStore.getState()).toMatchObject({
      token: 'legacy-token',
      currentUser: { username: 'admin', role: 'admin' },
      isAuthenticated: true,
    })
  })

  afterEach(() => {
    localStorage.clear()
    useAdminAuthStore.getState().clearAuth()
  })

  it('后台登录成功后应保存 Token 和管理员资料', () => {
    useAdminAuthStore.getState().setAuth('token-1', {
      id: 1,
      username: 'admin',
      name: '梦梦',
      role: 'admin',
    })

    expect(useAdminAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAdminAuthStore.getState().token).toBe('token-1')
    expect(useAdminAuthStore.getState().currentUser).toMatchObject({
      username: 'admin',
      role: 'admin',
    })
    expect(storage.get('blog-web:token')).toBe('token-1')
  })

  it('刷新 Token 成功后应只更新 token 不改 currentUser', () => {
    const currentUser = {
      id: 1,
      username: 'admin',
      name: '梦梦',
      role: 'admin',
    }
    useAdminAuthStore.getState().setAuth('old-token', currentUser)

    useAdminAuthStore.getState().setToken('new-token')

    expect(useAdminAuthStore.getState().token).toBe('new-token')
    expect(useAdminAuthStore.getState().currentUser).toEqual(currentUser)
    expect(useAdminAuthStore.getState().isAuthenticated).toBe(true)
    expect(storage.get('blog-web:token')).toBe('new-token')
  })

  it('保存管理员资料成功后应更新 currentUser', () => {
    useAdminAuthStore.getState().setAuth('token-1', {
      id: 1,
      username: 'admin',
      name: '梦梦',
      role: 'admin',
    })

    useAdminAuthStore.getState().setCurrentUser({
      id: 1,
      username: 'admin',
      name: '新梦梦',
      role: 'admin',
      avatar: '/files/new.png',
    })

    expect(useAdminAuthStore.getState().token).toBe('token-1')
    expect(useAdminAuthStore.getState().currentUser).toMatchObject({
      name: '新梦梦',
      avatar: '/files/new.png',
    })
    expect(storage.get('blog-web:user')).toMatchObject({
      name: '新梦梦',
    })
  })

  it('请求层收到 401 时应清理登录态', () => {
    useAdminAuthStore.getState().setAuth('token-1', {
      id: 1,
      username: 'admin',
      name: '梦梦',
      role: 'admin',
    })

    useAdminAuthStore.getState().clearAuth()

    expect(useAdminAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAdminAuthStore.getState().token).toBeNull()
    expect(useAdminAuthStore.getState().currentUser).toBeNull()
    expect(storage.get('blog-web:token')).toBeNull()
    expect(storage.get('blog-web:user')).toBeNull()
  })
})
