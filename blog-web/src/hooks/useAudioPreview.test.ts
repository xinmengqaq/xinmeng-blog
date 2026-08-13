import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAudioPreview } from './useAudioPreview'

class AudioMock extends EventTarget {
  static instances: AudioMock[] = []
  currentTime = 0
  duration = 150
  paused = true
  preload = ''
  src: string
  volume = 1
  load = vi.fn()
  pause = vi.fn(() => {
    this.paused = true
  })
  play = vi.fn(async () => {
    if (!this.src) throw new DOMException('missing source', 'NotSupportedError')
    this.paused = false
  })
  removeAttribute = vi.fn((name: string) => {
    if (name === 'src') this.src = ''
  })

  constructor(src: string) {
    super()
    this.src = src
    AudioMock.instances.push(this)
  }
}

describe('共享音频播放', () => {
  afterEach(() => {
    AudioMock.instances = []
    vi.unstubAllGlobals()
  })

  it('暂停后再次播放复用原音频和进度', async () => {
    // Given 前台正在播放一首歌曲并已产生播放进度
    vi.stubGlobal('Audio', AudioMock)
    const track = { id: 7, audio_url: '/music/bloom.mp3' }
    const hook = renderHook(() => useAudioPreview(vi.fn()))

    await act(() => hook.result.current.togglePlayback(track))
    const audio = AudioMock.instances[0]
    audio.currentTime = 48
    act(() => audio.dispatchEvent(new Event('timeupdate')))

    // When 用户暂停后再次点击播放
    await act(() => hook.result.current.togglePlayback(track))
    await act(() => hook.result.current.togglePlayback(track))

    // Then 应从原进度继续，不新建音频也不清空地址
    expect(AudioMock.instances).toHaveLength(1)
    expect(audio.currentTime).toBe(48)
    expect(audio.src).toBe('/music/bloom.mp3')
    expect(audio.play).toHaveBeenCalledTimes(2)
    expect(hook.result.current.currentTime).toBe(48)
  })

  it('支持前台播放器传入默认音量', () => {
    // Given 前台播放器要求首次创建时使用一半音量
    vi.stubGlobal('Audio', AudioMock)

    // When 创建共享音频播放 Hook 并加载歌曲
    const hook = renderHook(() => useAudioPreview(vi.fn(), 0.5))
    act(() => {
      void hook.result.current.play(
        { id: 8, audio_url: '/music/rose.mp3' },
        true,
      )
    })

    // Then 音频实例和 Hook 状态都应保持 50% 音量
    expect(AudioMock.instances[0].volume).toBe(0.5)
    expect(hook.result.current.volume).toBe(0.5)
  })

  it('创建音频后立即发起播放并启用预加载', async () => {
    // Given 首页获得一首可自动播放的公开音乐
    vi.stubGlobal('Audio', AudioMock)
    const hook = renderHook(() => useAudioPreview(vi.fn(), 0.5))

    // When 播放器首次发起静默失败的自动播放尝试
    await act(() =>
      hook.result.current.play(
        { id: 9, audio_url: '/music/morning.mp3' },
        true,
      ),
    )

    // Then 不等待额外媒体事件，直接交给浏览器播放 Promise 处理加载
    const audio = AudioMock.instances[0]
    expect(audio.preload).toBe('auto')
    expect(audio.load).not.toHaveBeenCalled()
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(hook.result.current.playingId).toBe(9)
  })
})
