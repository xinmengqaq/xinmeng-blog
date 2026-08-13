import { afterEach, describe, expect, it } from 'vitest'

import { consumeRegisteredEmail, markRegisteredEmail } from './userFirstLogin'

describe('注册邮箱首次登录标记', () => {
  afterEach(() => sessionStorage.clear())

  it('标记仅在当前会话为匹配邮箱消费一次', () => {
    // Given 当前浏览器会话记录了刚注册的邮箱
    markRegisteredEmail('User@Example.com')
    // When 相同邮箱首次登录成功或其他邮箱登录
    expect(consumeRegisteredEmail('other@example.com')).toBe(false)
    expect(consumeRegisteredEmail('user@example.com')).toBe(true)
    // Then 只有相同邮箱首次登录进入资料页且标记立即消费
    expect(consumeRegisteredEmail('user@example.com')).toBe(false)
    expect(localStorage.length).toBe(0)
  })
})
