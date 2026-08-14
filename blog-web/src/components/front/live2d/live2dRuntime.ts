import type { FrontLive2DModelConfig } from '@/config/frontLive2D'
import type { Config } from 'live2d-widgets'

import type { FrontLive2DTool } from './live2dTools'

type Live2DLifecycleModel = {
  stop?: () => void
  run?: () => void
  release?: () => void
}

type Live2DLifecycle = {
  listeners: Array<[EventTarget, (event: Event) => void, unknown]>
  intervals: number[]
  model: Live2DLifecycleModel | null
  pauseRequested: boolean
  disposed: boolean
  generation: number
  clear: () => void
}

const getLifecycle = (): Live2DLifecycle | undefined =>
  (window as typeof window & { __live2dLifecycle?: Live2DLifecycle })
    .__live2dLifecycle

export type Live2DInstance = {
  cleanup: () => void
}

const removeLive2DNodes = () => {
  document.getElementById('waifu')?.remove()
  document.getElementById('waifu-toggle')?.remove()
}

export const mountFrontLive2D = async (
  model: FrontLive2DModelConfig,
  tools: FrontLive2DTool[],
): Promise<Live2DInstance> => {
  await Promise.all([
    import('live2d-widgets/dist/waifu-tips.js'),
    import('live2d-widgets/dist/waifu.css'),
  ])
  await import('./frontLive2DWidget.css')

  const initWidget = (
    window as typeof window & { initWidget?: (config: Config) => void }
  ).initWidget
  if (!initWidget) throw new Error('Live2D widget failed to initialize')

  const lifecycle = getLifecycle()
  if (lifecycle) {
    lifecycle.disposed = false
    lifecycle.pauseRequested = false
  }

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
  let disposed = false
  let entryFrame = 0
  let tipsTimer = 0
  let entryObserver: MutationObserver | undefined
  let pauseObserver: MutationObserver | undefined

  const shouldPause = () => {
    const node = document.getElementById('waifu')
    return (
      document.hidden ||
      node?.classList.contains('waifu-hidden') === true ||
      node?.classList.contains('live2d-is-over-banner') === true
    )
  }

  const syncPaused = () => {
    if (disposed || !lifecycle) return
    if (shouldPause()) {
      lifecycle.pauseRequested = true
      lifecycle.model?.stop?.()
    } else if (lifecycle.pauseRequested && lifecycle.model) {
      lifecycle.pauseRequested = false
      lifecycle.model.run?.()
    }
  }

  const handleVisibility = () => syncPaused()
  document.addEventListener('visibilitychange', handleVisibility)
  if (widget) {
    pauseObserver = new MutationObserver(syncPaused)
    pauseObserver.observe(widget, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }

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

  return {
    cleanup: () => {
      if (disposed) return
      disposed = true
      entryObserver?.disconnect()
      pauseObserver?.disconnect()
      window.cancelAnimationFrame(entryFrame)
      window.clearTimeout(tipsTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (lifecycle) {
        lifecycle.disposed = true
        lifecycle.model?.release?.()
        lifecycle.clear()
      }
      removeLive2DNodes()
    },
  }
}
