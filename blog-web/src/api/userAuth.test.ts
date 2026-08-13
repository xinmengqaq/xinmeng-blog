import { afterEach, describe, expect, it, vi } from 'vitest'

import { publicRequest, userRequest } from '@/utils/request'
import { loginUser, logoutUser, restoreUserAccount } from './userAuth'

vi.mock('@/utils/request', () => ({
  publicRequest: { post: vi.fn() },
  userRequest: { post: vi.fn() },
}))

describe('普通用户登录与恢复 API', () => {
  afterEach(() => vi.clearAllMocks())

  it('登录和恢复使用公开请求入口及真实后端字段', () => {
    // Given 访客提交邮箱、密码和记住我选择
    const credentials = {
      email: 'user@example.com',
      password: 'password-1',
      rememberMe: true,
    }
    // When 分别请求登录和恢复待删除账号
    loginUser(credentials)
    restoreUserAccount({
      email: credentials.email,
      password: credentials.password,
    })
    // Then 请求使用公开入口和真实路径字段，不携带管理员身份
    expect(publicRequest.post).toHaveBeenNthCalledWith(
      1,
      '/user/login',
      credentials,
    )
    expect(publicRequest.post).toHaveBeenNthCalledWith(
      2,
      '/user/account/restore',
      { email: credentials.email, password: credentials.password },
    )
  })

  it('退出登录只使用普通用户请求入口', () => {
    logoutUser()

    expect(userRequest.post).toHaveBeenCalledWith('/user/logout')
    expect(publicRequest.post).not.toHaveBeenCalled()
  })
})
