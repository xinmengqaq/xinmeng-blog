import { loadConfigFromFile } from 'vite'
import { describe, expect, it } from 'vitest'

describe('Vite 文件服务代理', () => {
  it('将管理员和普通用户文件请求及静态图片转发给文件服务', async () => {
    // Given 管理员或普通用户请求文件接口，或页面读取 FastAPI 返回的图片地址
    // When 浏览器在开发环境发起对应请求
    // Then Vite 将文件 API 和 /files 原样代理到 FastAPI，而不是转给 Spring Boot 或前端 HTML
    const loadedConfig = await loadConfigFromFile(
      { command: 'serve', mode: 'test' },
      'vite.config.ts',
    )

    expect(loadedConfig?.config.server?.proxy).toMatchObject({
      '/api/admin/files': {
        target: 'http://localhost:8000',
      },
      '/api/user/files': {
        target: 'http://localhost:8000',
      },
      '/files': {
        target: 'http://localhost:8000',
      },
    })
  })
})
