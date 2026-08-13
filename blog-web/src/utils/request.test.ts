import { AxiosError, type AxiosAdapter } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import { useAdminAuthStore } from '@/store/auth'
import { useUserAuthStore } from '@/store/userAuth'

import {
  adminApiClient,
  adminRequest,
  publicApiClient,
  publicRequest,
  userApiClient,
  userRequest,
} from './request'

const makeAdapter =
  (data: unknown, status = 200): AxiosAdapter =>
  (config) =>
    Promise.resolve({
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    })

const makeErrorAdapter =
  (data: unknown, status: number): AxiosAdapter =>
  (config) => {
    const response = {
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    }
    return Promise.reject(
      new AxiosError('Request failed', undefined, config, undefined, response),
    )
  }

describe('request', () => {
  it('三类请求只携带各自允许的身份且失效互不影响', async () => {
    // Given 管理员和普通用户在同一浏览器均已登录
    useAdminAuthStore.getState().setAuth('admin-token', {
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'admin',
    })
    useUserAuthStore.getState().setAuth('user-token', {
      id: 2,
      email: 'user@example.com',
      nickname: '普通用户',
      avatar: null,
    })

    // When 公开、管理员和普通用户请求分别发出并各自收到未登录响应
    publicApiClient.defaults.adapter = (config) => {
      expect(config.headers?.Authorization).toBeUndefined()
      return makeAdapter({ code: '0', data: undefined })(config)
    }
    adminApiClient.defaults.adapter = (config) => {
      expect(config.headers?.Authorization).toBe('Bearer admin-token')
      return makeAdapter({ code: '0', data: undefined })(config)
    }
    userApiClient.defaults.adapter = (config) => {
      expect(config.headers?.Authorization).toBe('Bearer user-token')
      return makeAdapter({ code: '0', data: undefined })(config)
    }

    await Promise.all([
      publicRequest.get('/public'),
      adminRequest.get('/admin/profile'),
      userRequest.get('/user/profile'),
    ])

    // Then 公开请求不带凭证，管理员请求只带管理员凭证，普通用户请求只带普通用户凭证
    adminApiClient.defaults.adapter = makeErrorAdapter(
      { code: '401', msg: '管理员登录已失效' },
      401,
    )
    await expect(adminRequest.get('/admin/expired')).rejects.toMatchObject({
      code: '401',
    })
    expect(useAdminAuthStore.getState().isAuthenticated).toBe(false)
    expect(useUserAuthStore.getState().isAuthenticated).toBe(true)

    // Then 任一身份失效只清理自身状态，不影响另一身份
    useAdminAuthStore.getState().setAuth('admin-token', {
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'admin',
    })
    userApiClient.defaults.adapter = makeErrorAdapter(
      { code: '401', msg: '用户登录已失效' },
      401,
    )
    await expect(userRequest.get('/user/expired')).rejects.toMatchObject({
      code: '401',
    })
    expect(useUserAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAdminAuthStore.getState().isAuthenticated).toBe(true)
  })

  afterEach(() => {
    publicApiClient.defaults.adapter = undefined
    adminApiClient.defaults.adapter = undefined
    userApiClient.defaults.adapter = undefined
    localStorage.clear()
    useAdminAuthStore.getState().clearAuth()
    useUserAuthStore.getState().clearAuth()
  })

  it('有 Token 时自动添加 Authorization 请求头并返回后端 data', async () => {
    useAdminAuthStore.getState().setAuth('token-1', {
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'admin',
    })
    adminApiClient.defaults.adapter = (config) => {
      expect(config.headers?.Authorization).toBe('Bearer token-1')
      return makeAdapter({ code: '0', msg: '成功', data: { ok: true } })(config)
    }

    await expect(adminRequest.get<{ ok: boolean }>('/ping')).resolves.toEqual({
      ok: true,
    })
  })

  it('后端业务失败时抛出统一错误对象', async () => {
    publicApiClient.defaults.adapter = makeErrorAdapter(
      { code: '400', msg: '参数错误', data: null },
      400,
    )

    await expect(publicRequest.get('/bad')).rejects.toMatchObject({
      code: '400',
      message: '参数错误',
      status: 400,
    })
  })

  it('真实 Axios 400 错误优先展示后端中文消息而非英文传输层原文', async () => {
    publicApiClient.defaults.adapter = (config) => {
      const response = {
        data: { code: '400', msg: '图形验证码错误', data: null },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config,
      }
      return Promise.reject(
        new AxiosError(
          'Request failed with status code 400',
          'ERR_BAD_REQUEST',
          config,
          undefined,
          response,
        ),
      )
    }

    await expect(
      publicRequest.post('/user/register/email-code'),
    ).rejects.toMatchObject({
      code: '400',
      message: '图形验证码错误',
      status: 400,
    })
  })

  it('后端业务失败时保留结构化错误详情', async () => {
    // Given 后端返回带等待秒数的点赞限频错误
    publicApiClient.defaults.adapter = makeErrorAdapter(
      {
        code: '429',
        msg: '点赞过于频繁',
        data: { retryAfterSeconds: 45 },
      },
      429,
    )

    // When 前端请求公开点赞接口
    const response = publicRequest.post('/articles/9/like')

    // Then 统一错误对象应保留后端结构化详情供页面展示
    await expect(response).rejects.toMatchObject({
      code: '429',
      message: '点赞过于频繁',
      details: { retryAfterSeconds: 45 },
    })
  })

  it('未登录响应会清理登录态', async () => {
    useAdminAuthStore.getState().setAuth('token-1', {
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'admin',
    })
    adminApiClient.defaults.adapter = makeErrorAdapter(
      { code: '401', msg: '登录已失效', data: null },
      401,
    )

    await expect(adminRequest.get('/expired')).rejects.toMatchObject({
      code: '401',
    })
    expect(useAdminAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('支持 PATCH 请求并传递请求体', async () => {
    adminApiClient.defaults.adapter = (config) => {
      expect(config.method).toBe('patch')
      expect(config.url).toBe('/admin/profile/password')
      expect(config.data).toBe(JSON.stringify({ oldPassword: 'old-pass' }))

      return makeAdapter({ code: '0', msg: '成功', data: undefined })(config)
    }

    await expect(
      adminRequest.patch<void>('/admin/profile/password', {
        oldPassword: 'old-pass',
      }),
    ).resolves.toBeUndefined()
  })

  it('网络错误能转换成后端未启动提示', async () => {
    publicApiClient.defaults.adapter = () =>
      Promise.reject(new AxiosError('Network Error'))

    await expect(publicRequest.get('/down')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: '无法连接后端服务，请确认服务是否已启动',
    })
  })

  it('统一 /api 客户端支持 FastAPI 的 message 字段而非 msg', async () => {
    // Given /api/admin/files 返回 FastAPI 的 message 错误字段
    // When 前端通过统一 /api 客户端处理响应
    // Then 页面得到与 Spring 接口一致的错误对象
    adminApiClient.defaults.adapter = makeErrorAdapter(
      { code: '400', message: '参数错误', data: null },
      400,
    )

    await expect(adminRequest.get('/admin/files/bad')).rejects.toMatchObject({
      code: '400',
      message: '参数错误',
      status: 400,
    })
  })

  it('统一 /api 客户端处理 FastAPI 401 时清理登录态并保留中文消息', async () => {
    // Given 已登录管理员请求 /api/admin/files 且 FastAPI 返回 401 与 message
    // When 统一客户端处理该响应
    // Then 登录态被清理且页面收到原中文错误消息
    useAdminAuthStore.getState().setAuth('token-1', {
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'admin',
    })

    adminApiClient.defaults.adapter = (config) => {
      expect(config.headers?.Authorization).toBe('Bearer token-1')
      return makeErrorAdapter(
        { code: '401', message: '登录已失效', data: null },
        401,
      )(config)
    }

    await expect(adminRequest.get('/admin/files/expired')).rejects.toMatchObject({
      code: '401',
      message: '登录已失效',
      status: 401,
    })
    expect(useAdminAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('统一 /api 客户端将 FastAPI 网络错误转换成服务提示', async () => {
    // Given /api/admin/files 的 FastAPI 代理不可用
    // When 请求在网络层失败
    // Then 页面收到现有的后端服务不可用提示
    adminApiClient.defaults.adapter = () =>
      Promise.reject(new AxiosError('Network Error'))

    await expect(adminRequest.get('/admin/files/down')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: '无法连接后端服务，请确认服务是否已启动',
    })
  })
})
