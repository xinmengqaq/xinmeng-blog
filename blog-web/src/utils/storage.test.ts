import { afterEach, describe, expect, it } from 'vitest'

import { storage } from './storage'

describe('storage', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('保存并读取 JSON 数据', () => {
    storage.set('blog-web:user', { id: 1, username: 'admin' })

    expect(
      storage.get<{ id: number; username: string }>('blog-web:user'),
    ).toEqual({
      id: 1,
      username: 'admin',
    })
  })

  it('读取坏掉的 JSON 时清理缓存并返回 null', () => {
    localStorage.setItem('blog-web:user', '{bad json')

    expect(storage.get('blog-web:user')).toBeNull()
    expect(localStorage.getItem('blog-web:user')).toBeNull()
  })
})
