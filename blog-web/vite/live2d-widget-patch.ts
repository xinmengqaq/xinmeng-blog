import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { Plugin } from 'vite'

/**
 * live2d-widgets@1.0.1 构建期生命周期补丁。
 *
 * 背景：包的浏览器发行入口 dist/waifu-tips.js 是自包含单文件模块，只导出
 * logger（结尾 `export{a as l}`），Cubism 5 渲染循环、8 个 window 监听器、
 * 两个 setInterval 全部封闭在模块内部，没有任何暂停或销毁 API。此处通过
 * Vite 解析钩子在构建期注入统一生命周期出口，不修改 node_modules，不新增
 * 依赖。每个注入点做唯一性校验，锚点失效（包升级或结构变化）时构建报错，
 * 而不是静默降级。
 */

export const WIDGET_MODULE_ID = 'live2d-widgets/dist/waifu-tips.js'
const VIRTUAL_WIDGET_ID = '\0live2d-widgets/dist/waifu-tips.js'
export const WIDGET_SOURCE_PATH = resolve(
  process.cwd(),
  'node_modules/live2d-widgets/dist/waifu-tips.js',
)
const CHUNK_SOURCE_PATHS: Record<string, string> = {
  './chunk/index.js': resolve(
    process.cwd(),
    'node_modules/live2d-widgets/dist/chunk/index.js',
  ),
  './chunk/index2.js': resolve(
    process.cwd(),
    'node_modules/live2d-widgets/dist/chunk/index2.js',
  ),
}

const REGISTRY_INJECTION = [
  'const __wl=window.__live2dLifecycle=window.__live2dLifecycle||{listeners:[],intervals:new Set(),model:null,pauseRequested:!1,disposed:!1,generation:0};',
  '__wl.on=(t,f,o)=>{t.addEventListener(f,o),__wl.listeners.push([t,f,o])};',
  '__wl.clear=()=>{for(const[t,f,o]of __wl.listeners)t.removeEventListener(f,o);__wl.listeners=[],__wl.intervals.forEach(clearInterval),__wl.intervals.clear(),__wl.model=null};',
].join('')

const replaceOnce = (
  source: string,
  anchor: string,
  replacement: string,
): string => {
  const count = source.split(anchor).length - 1
  if (count !== 1) {
    throw new Error(
      `live2d-widget-patch: 注入锚点 "${anchor}" 在 live2d-widgets/dist/waifu-tips.js 中出现 ${count} 次（期望 1 次），` +
        '包结构可能已变化。请核对 node_modules/live2d-widgets 的锁定版本 1.0.1 并更新 vite/live2d-widget-patch.ts。',
    )
  }
  return source.replace(anchor, replacement)
}

const replaceAll = (
  source: string,
  anchor: string,
  replacement: string,
  expected: number,
): string => {
  const count = source.split(anchor).length - 1
  if (count !== expected) {
    throw new Error(
      `live2d-widget-patch: 注入锚点 "${anchor}" 出现 ${count} 次（期望 ${expected} 次），` +
        '包结构可能已变化。请核对 node_modules/live2d-widgets 的锁定版本 1.0.1 并更新 vite/live2d-widget-patch.ts。',
    )
  }
  return source.replaceAll(anchor, replacement)
}

export const buildPatchedWaifuTips = (source: string): string => {
  let patched = source

  patched = replaceOnce(patched, '*/', `*/${REGISTRY_INJECTION}`)
  // loadWidget 开头：disposed 短路 + 挂载代际捕获
  patched = replaceOnce(
    patched,
    'var o;localStorage',
    'var o;if(__wl.disposed)return;const g=++__wl.generation;localStorage',
  )
  // registerEventListener 调用点：disposed 或代际过期时不再注册任何监听器
  patched = replaceOnce(
    patched,
    'l=s.models,function(t){',
    'l=s.models,__wl.disposed||g===__wl.generation&&function(t){',
  )
  // 1s 空闲轮询与惰性 20s 消息 interval 整体登记（包裹不破坏原括号平衡）；
  // 惰性 interval 被 clearInterval 清除时同步从登记表删除，避免长会话积累无效句柄
  patched = replaceOnce(
    patched,
    'setInterval((()=>{s?(s=!1,clearInterval(o),o=null):o||(o=setInterval((()=>{i(n,6e3,9)}),2e4))}),1e3)',
    '__wl.intervals.add(setInterval((()=>{s?(s=!1,clearInterval(o),o=null):o||(o=setInterval((()=>{i(n,6e3,9)}),2e4),__wl.intervals.add(o))}),1e3))',
  )
  patched = replaceOnce(
    patched,
    'clearInterval(o),o=null',
    'clearInterval(o),__wl.intervals.delete(o),o=null',
  )
  // 模型加载链：disposed 或代际过期时不再启动模型加载
  patched = replaceOnce(
    patched,
    'await c.initCheck(t,l);await a.loadModel("")',
    'await c.initCheck(t,l);__wl.disposed||g===__wl.generation&&await a.loadModel("")',
  )
  // Cubism5 run() 启动渲染循环后登记实例；已有暂停请求时立即 stop
  patched = replaceOnce(
    patched,
    'this.cubism5model.run())',
    'this.cubism5model.run(),__wl.model=this.cubism5model,__wl.pauseRequested&&this.cubism5model.stop())',
  )
  // showMessage 节点空守卫：卸载后残留定时器不再抛 TypeError
  patched = replaceOnce(
    patched,
    'const a=document.getElementById("waifu-tips");a.innerHTML=t,a.classList.add("waifu-tips-active"),s=setTimeout((()=>{sessionStorage.removeItem("waifu-message-priority"),a.classList.remove("waifu-tips-active")}),o)',
    'const a=document.getElementById("waifu-tips");if(a){a.innerHTML=t,a.classList.add("waifu-tips-active"),s=setTimeout((()=>{sessionStorage.removeItem("waifu-message-priority"),a.classList.remove("waifu-tips-active")}),o)}',
  )
  // 8 个 window 监听器改为登记后注册，卸载时按句柄成对移除
  patched = replaceAll(
    patched,
    'window.addEventListener(',
    '__wl.on(window,',
    8,
  )

  return patched
}

const normalizePath = (path: string) => {
  try {
    return decodeURIComponent(path)
      .replace(/\\/g, '/')
      .replace(/^\/@fs\//, '')
      .replace(/^file:\/\/\//, '')
      .toLowerCase()
  } catch {
    return path
      .replace(/\\/g, '/')
      .replace(/^\/@fs\//, '')
      .replace(/^file:\/\/\//, '')
      .toLowerCase()
  }
}

export const live2dWidgetPatch = (): Plugin => ({
  name: 'live2d-widget-patch',
  enforce: 'pre',
  resolveId(id, importer) {
    if (id === WIDGET_MODULE_ID) return VIRTUAL_WIDGET_ID
    if (importer === VIRTUAL_WIDGET_ID && id in CHUNK_SOURCE_PATHS) {
      return CHUNK_SOURCE_PATHS[id]
    }
    if (
      id === '../waifu-tips.js' &&
      typeof importer === 'string' &&
      Object.values(CHUNK_SOURCE_PATHS)
        .map(normalizePath)
        .includes(normalizePath(importer))
    ) {
      return VIRTUAL_WIDGET_ID
    }
    return null
  },
  load(id) {
    if (id !== VIRTUAL_WIDGET_ID) return null
    return buildPatchedWaifuTips(readFileSync(WIDGET_SOURCE_PATH, 'utf8'))
  },
})
