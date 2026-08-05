import type { FrontLive2DModelConfig } from '@/config/frontLive2D'
import type { Config } from 'live2d-widgets'

import type { FrontLive2DTool } from './live2dTools'

const removeLive2DNodes = () => {
  document.getElementById('waifu')?.remove()
  document.getElementById('waifu-toggle')?.remove()
}

export const mountFrontLive2D = async (
  model: FrontLive2DModelConfig,
  tools: FrontLive2DTool[],
) => {
  await Promise.all([
    import('live2d-widgets/dist/waifu-tips.js'),
    import('live2d-widgets/dist/waifu.css'),
  ])
  await import('./frontLive2DWidget.css')

  const initWidget = (
    window as typeof window & { initWidget?: (config: Config) => void }
  ).initWidget
  if (!initWidget) throw new Error('Live2D widget failed to initialize')

  removeLive2DNodes()
  initWidget({
    waifuPath: model.waifuPath,
    cubism2Path: model.cubism2Path,
    cubism5Path: model.cubism5Path,
    tools,
    showToggleAfterQuit: true,
    logLevel: 'warn',
  })

  const widget = document.getElementById('waifu')
  let entryFrame = 0
  let tipsTimer = 0
  let entryObserver: MutationObserver | undefined

  const revealWhenReady = () => {
    if (!widget?.classList.contains('waifu-active')) return
    entryObserver?.disconnect()
    widget.classList.remove('live2d-is-preparing')
    entryFrame = window.requestAnimationFrame(() => {
      entryFrame = window.requestAnimationFrame(() => {
        widget.classList.remove('live2d-is-entering')
        tipsTimer = window.setTimeout(() => {
          widget.classList.remove('live2d-is-entering-tips')
        }, 450)
      })
    })
  }

  if (widget) {
    widget.classList.add(
      'live2d-is-preparing',
      'live2d-is-entering',
      'live2d-is-entering-tips',
    )
    entryObserver = new MutationObserver(revealWhenReady)
    entryObserver.observe(widget, {
      attributes: true,
      attributeFilter: ['class'],
    })
    revealWhenReady()
  }

  return () => {
    entryObserver?.disconnect()
    window.cancelAnimationFrame(entryFrame)
    window.clearTimeout(tipsTimer)
    removeLive2DNodes()
  }
}
