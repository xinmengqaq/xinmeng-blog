import { describe, expect, it } from 'vitest'

import { getUserLogoutTarget } from './userLogoutTarget'

describe('普通用户退出来源', () => {
  it('资料页退出替换到首页，公开页保留当前地址', () => {
    // Given 用户从公开页或个人资料页确认退出
    // When 计算退出后的导航目标
    // Then 资料页返回首页，其他公开页保持当前地址
    expect(getUserLogoutTarget('/profile')).toEqual({ redirectTo: '/', replace: true })
    expect(getUserLogoutTarget('/articles/8?from=home')).toEqual({
      redirectTo: '/articles/8?from=home', replace: false,
    })
  })
})
