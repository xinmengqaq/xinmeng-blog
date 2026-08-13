import { afterEach, describe, expect, it, vi } from 'vitest'

import { userRequest } from '@/utils/request'
import { getUserProfile, updateUserProfile } from './userProfile'
import { changeUserEmail, changeUserPassword, cancelUserAccount, sendUserEmailChangeCode } from './userProfile'

vi.mock('@/utils/request', () => ({ userRequest: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn() } }))

describe('普通用户资料 API', () => {
  afterEach(() => vi.clearAllMocks())

  it('资料读取和昵称保存各自只发送一个用户请求', () => {
    // Given 已登录普通用户读取或保存昵称
    // When 调用资料 API
    getUserProfile()
    updateUserProfile({ nickname: '新昵称' })
    // Then 使用用户请求入口和真实资料路径字段
    expect(userRequest.get).toHaveBeenCalledWith('/user/profile')
    expect(userRequest.put).toHaveBeenCalledWith('/user/profile', { nickname: '新昵称' })
  })

  it('账户安全 API 使用用户请求入口和真实字段', () => {
    // Given 用户提交改邮箱、改密码或注销操作
    // When 调用对应资料安全 API
    // Then 各函数只发送一个真实用户请求且不访问管理员入口
    sendUserEmailChangeCode({ currentPassword: 'password-1', newEmail: 'new@example.com', captchaId: 'captcha-1', captchaCode: 'A2B3' })
    changeUserEmail({ currentPassword: 'password-1', newEmail: 'new@example.com', emailCode: '123456' })
    changeUserPassword({ currentPassword: 'password-1', newPassword: 'password-2' })
    cancelUserAccount()
    expect(userRequest.post).toHaveBeenCalledWith('/user/profile/email-code', expect.any(Object))
    expect(userRequest.patch).toHaveBeenNthCalledWith(1, '/user/profile/email', expect.any(Object))
    expect(userRequest.patch).toHaveBeenNthCalledWith(2, '/user/profile/password', expect.any(Object))
    expect(userRequest.post).toHaveBeenLastCalledWith('/user/account/cancel')
  })
})
