import { afterEach, describe, expect, it } from 'vitest'

import { storage } from '@/utils/storage'

import { useAuthStore } from './auth'

describe('useAuthStore', () => {
  afterEach(() => {
    localStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  it('后台登录成功后应保存 Token 和管理员资料', () => {
    useAuthStore.getState().setAuth('token-1', {
      id: 1,
      username: 'admin',
      name: '梦梦',
      role: 'admin',
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().token).toBe('token-1')
    expect(useAuthStore.getState().currentUser).toMatchObject({
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
    useAuthStore.getState().setAuth('old-token', currentUser)

    useAuthStore.getState().setToken('new-token')

    expect(useAuthStore.getState().token).toBe('new-token')
    expect(useAuthStore.getState().currentUser).toEqual(currentUser)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(storage.get('blog-web:token')).toBe('new-token')
  })

  it('保存管理员资料成功后应更新 currentUser', () => {
    useAuthStore.getState().setAuth('token-1', {
      id: 1,
      username: 'admin',
      name: '梦梦',
      role: 'admin',
    })

    useAuthStore.getState().setCurrentUser({
      id: 1,
      username: 'admin',
      name: '新梦梦',
      role: 'admin',
      avatar: '/files/new.png',
    })

    expect(useAuthStore.getState().token).toBe('token-1')
    expect(useAuthStore.getState().currentUser).toMatchObject({
      name: '新梦梦',
      avatar: '/files/new.png',
    })
    expect(storage.get('blog-web:user')).toMatchObject({
      name: '新梦梦',
    })
  })

  it('请求层收到 401 时应清理登录态', () => {
    useAuthStore.getState().setAuth('token-1', {
      id: 1,
      username: 'admin',
      name: '梦梦',
      role: 'admin',
    })

    useAuthStore.getState().clearAuth()

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().currentUser).toBeNull()
    expect(storage.get('blog-web:token')).toBeNull()
    expect(storage.get('blog-web:user')).toBeNull()
  })
})
