import { loadConfigFromFile } from 'vite'
import { describe, expect, it } from 'vitest'

describe('Vite 文件服务代理', () => {
  it('将 FastAPI 返回的静态图片地址转发给文件服务', async () => {
    // Given 头像上传成功后后端确认地址是 /files/admins/avatar/xxx.jpg
    // When 浏览器在开发环境请求该图片地址
    // Then Vite 将 /files 原样代理到 FastAPI，而不是回退到前端 HTML
    const loadedConfig = await loadConfigFromFile(
      { command: 'serve', mode: 'test' },
      'vite.config.ts',
    )

    expect(loadedConfig?.config.server?.proxy).toMatchObject({
      '/api/admin/files': {
        target: 'http://localhost:8000',
      },
      '/files': {
        target: 'http://localhost:8000',
      },
    })
  })
})
