import { afterEach, describe, expect, it, vi } from 'vitest'

import { request } from '@/utils/request'

import {
  changeAdminPassword,
  getAdminProfile,
  refreshAdminToken,
  updateAdminProfile,
  validateAdminToken,
} from './admin'
import { getAdminCaptcha, login, logout } from './auth'

vi.mock('@/utils/request', () => ({
  request: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

describe('后台认证 API', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('登录接口使用真实后台登录路径并返回 AdminVO', () => {
    const params = {
      username: 'admin',
      password: 'secret',
      captchaID: 'captcha-id-1',
      captchaCode: 'A2B3',
    }

    login(params)

    expect(request.post).toHaveBeenCalledWith('/admin/login', params)
  })

  it('获取登录验证码使用 GET /admin/captcha', () => {
    getAdminCaptcha()

    expect(request.get).toHaveBeenCalledWith('/admin/captcha')
  })

  it('退出接口使用真实后台退出路径', () => {
    logout()

    expect(request.post).toHaveBeenCalledWith('/admin/logout')
  })
})

describe('后台管理员 API', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('获取管理员资料使用 GET /admin/profile', () => {
    getAdminProfile()

    expect(request.get).toHaveBeenCalledWith('/admin/profile')
  })

  it('保存管理员资料使用 PUT /admin/profile 并只传递文字资料参数', () => {
    const params = {
      username: 'xinmengqaq',
      name: '梦梦',
    }

    updateAdminProfile(params)

    expect(request.put).toHaveBeenCalledWith('/admin/profile', params)
  })

  it('修改管理员密码使用 PATCH /admin/profile/password 并传递密码参数', () => {
    const params = { oldPassword: 'old-pass', newPassword: 'new-pass' }

    changeAdminPassword(params)

    expect(request.patch).toHaveBeenCalledWith(
      '/admin/profile/password',
      params,
    )
  })

  it('校验 Token 使用 GET /admin/validate', () => {
    validateAdminToken()

    expect(request.get).toHaveBeenCalledWith('/admin/validate')
  })

  it('刷新 Token 使用 POST /admin/refresh', () => {
    refreshAdminToken()

    expect(request.post).toHaveBeenCalledWith('/admin/refresh')
  })
})
