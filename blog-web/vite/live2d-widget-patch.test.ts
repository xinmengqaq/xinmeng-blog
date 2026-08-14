import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildPatchedWaifuTips,
  live2dWidgetPatch,
  WIDGET_SOURCE_PATH,
} from './live2d-widget-patch'

const realSource = readFileSync(WIDGET_SOURCE_PATH, 'utf8')

describe('live2d-widget-patch', () => {
  it('锁定版本源码注入全部生命周期出口', () => {
    const patched = buildPatchedWaifuTips(realSource)

    expect(patched).toContain('window.__live2dLifecycle')
    expect(patched).toContain('__wl.on(window,')
    expect(patched).toContain('intervals:new Set()')
    expect(patched).toContain(
      'if(__wl.disposed)return;const g=++__wl.generation',
    )
    expect(patched).toContain(
      '__wl.disposed||g===__wl.generation&&function(t){',
    )
    expect(patched).toContain(
      '__wl.disposed||g===__wl.generation&&await a.loadModel("")',
    )
    expect(patched).toContain(
      'this.cubism5model.run(),__wl.model=this.cubism5model,__wl.pauseRequested&&this.cubism5model.stop()',
    )
    expect(patched).toContain('getElementById("waifu-tips");if(a){')
  })

  it('把全部 window 监听器改为登记后注册', () => {
    const patched = buildPatchedWaifuTips(realSource)
    expect(patched).not.toContain('window.addEventListener(')
    expect(patched.match(/__wl\.on\(window,/g)).toHaveLength(8)
  })

  it('两个空闲定时器全部登记到 Set', () => {
    const patched = buildPatchedWaifuTips(realSource)
    expect(patched).toContain('__wl.intervals.add(setInterval((')
    expect(patched).toContain(
      'o=setInterval((()=>{i(n,6e3,9)}),2e4),__wl.intervals.add(o)',
    )
  })

  it('惰性 interval 被清除时同步从登记表删除', () => {
    const patched = buildPatchedWaifuTips(realSource)
    expect(patched).toContain(
      'clearInterval(o),__wl.intervals.delete(o),o=null',
    )
    expect(patched).not.toContain('clearInterval(o),o=null)')
  })

  it('包结构变化导致锚点失效时抛错而不是静默降级', () => {
    expect(() => buildPatchedWaifuTips('const unrelated = 1')).toThrow(
      /注入锚点/,
    )
  })

  it('锚点出现次数变化时抛错', () => {
    const doubled = realSource.replace(
      'window.addEventListener(',
      'window.addEventListener(window.addEventListener(',
    )
    expect(() => buildPatchedWaifuTips(doubled)).toThrow(/注入锚点/)
  })

  it('开发模式 chunk 的 waifu-tips 相对导入也解析到补丁模块', () => {
    const plugin = live2dWidgetPatch()
    const resolveId = (id: string, importer: string | undefined) =>
      (plugin.resolveId as (id: string, importer?: string) => unknown)(
        id,
        importer,
      )

    const variants = [
      'D:/daimai/项目学习/blog-web/node_modules/live2d-widgets/dist/chunk/index2.js',
      'D:\\daimai\\项目学习\\blog-web\\node_modules\\live2d-widgets\\dist\\chunk\\index2.js',
      '/@fs/D:/daimai/%E9%A1%B9%E7%9B%AE%E5%AD%A6%E4%B9%A0/blog-web/node_modules/live2d-widgets/dist/chunk/index2.js',
      'file:///D:/daimai/%E9%A1%B9%E7%9B%AE%E5%AD%A6%E4%B9%A0/blog-web/node_modules/live2d-widgets/dist/chunk/index.js',
    ]
    for (const importer of variants) {
      expect(resolveId('../waifu-tips.js', importer)).toBe(
        '\0live2d-widgets/dist/waifu-tips.js',
      )
    }
  })

  it('非 chunk 来源的 waifu-tips 相对导入不做改写', () => {
    const plugin = live2dWidgetPatch()
    const resolveId = (id: string, importer: string | undefined) =>
      (plugin.resolveId as (id: string, importer?: string) => unknown)(
        id,
        importer,
      )

    expect(
      resolveId('../waifu-tips.js', '/src/components/front/live2d/x.ts'),
    ).toBe(null)
  })
})
