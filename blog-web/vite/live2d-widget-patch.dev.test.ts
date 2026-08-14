import { resolve } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type ViteDevServer } from 'vite'

const cwd = resolve(process.cwd())
const chunkIndexPath = resolve(
  cwd,
  'node_modules/live2d-widgets/dist/chunk/index.js',
)
const chunkIndex2Path = resolve(
  cwd,
  'node_modules/live2d-widgets/dist/chunk/index2.js',
)

describe('live2d-widget-patch 开发模式模块图', () => {
  let server: ViteDevServer

  beforeAll(async () => {
    server = await createServer({
      configFile: resolve(cwd, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'custom',
      logLevel: 'error',
      optimizeDeps: { noDiscovery: true },
    })
  }, 30000)

  afterAll(async () => {
    await server.close()
  }, 15000)

  it('业务动态导入解析到补丁虚拟模块', async () => {
    const resolved = await server.pluginContainer.resolveId(
      'live2d-widgets/dist/waifu-tips.js',
      undefined,
    )
    expect(resolved?.id).toBe('\0live2d-widgets/dist/waifu-tips.js')
  }, 15000)

  it('chunk 的 waifu-tips 相对导入在开发路径形式下解析到补丁模块', async () => {
    const importerVariants = [
      chunkIndex2Path.replace(/\\/g, '/'),
      chunkIndex2Path,
      '/@fs/' + encodeURI(chunkIndex2Path.replace(/\\/g, '/')),
      chunkIndexPath.replace(/\\/g, '/'),
    ]
    for (const importer of importerVariants) {
      const resolved = await server.pluginContainer.resolveId(
        '../waifu-tips.js',
        importer,
      )
      expect(resolved?.id, `importer: ${importer}`).toBe(
        '\0live2d-widgets/dist/waifu-tips.js',
      )
    }
  }, 15000)

  it('补丁模块内容由插件生命周期注入提供', async () => {
    const loaded = await server.pluginContainer.load(
      '\0live2d-widgets/dist/waifu-tips.js',
    )
    const code = typeof loaded === 'string' ? loaded : (loaded?.code ?? '')
    expect(code).toContain('__live2dLifecycle')
    expect(code).toContain('__wl.on(window,')
    expect(code).toContain('intervals:new Set()')
  }, 15000)
})
