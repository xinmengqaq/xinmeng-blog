import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FrontMusicPlayerProvider } from '@/hooks/front/musicPlayerContext'

const mocks = vi.hoisted(() => ({
  play: vi.fn().mockResolvedValue(true),
  fromTo: vi.fn((...args: [unknown, { y?: number }, unknown]) => {
    void args
    return { kill: vi.fn() }
  }),
  pageTransitionActive: true,
  query: {
    data: undefined as
      | {
          items: Array<{
            id: number
            title: string
            artist: null
            audio_url: string
            duration_ms: number
          }>
        }
      | undefined,
    isSuccess: false,
  },
  seek: vi.fn(),
  set: vi.fn(),
  setVolume: vi.fn(),
  stopPreview: vi.fn(),
  to: vi.fn(() => ({ kill: vi.fn() })),
  togglePlayback: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@gsap/react', async () => {
  const { useLayoutEffect } = await import('react')
  return {
    useGSAP: (
      callback: () => void | (() => void),
      config?: { dependencies?: unknown[] },
    ) =>
      // Test substitute must forward the dependency list supplied by useGSAP.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useLayoutEffect(callback, config?.dependencies),
  }
})

vi.mock('gsap', () => ({
  default: {
    fromTo: mocks.fromTo,
    registerPlugin: vi.fn(),
    set: mocks.set,
    to: mocks.to,
  },
}))

vi.mock('@/hooks/front/motionPreference', () => ({
  useFrontMotionPreference: () => ({
    motionAllowed: true,
    reducedMotion: false,
  }),
}))

vi.mock('@/hooks/front/pageTransitionContext', () => ({
  useFrontPageTransitionActive: () => mocks.pageTransitionActive,
}))

vi.mock('@/queries/music', () => ({
  usePublicMusicQuery: () => mocks.query,
}))

vi.mock('@/hooks/useAudioPreview', () => ({
  useAudioPreview: () => ({
    currentTime: 0,
    duration: 0,
    play: mocks.play,
    playingId: null,
    seek: mocks.seek,
    setVolume: mocks.setVolume,
    stopPreview: mocks.stopPreview,
    togglePlayback: mocks.togglePlayback,
    volume: 0.5,
  }),
}))

import { HeroMusicPlayer } from './HeroMusicPlayer'

describe('首页头图音乐播放器', () => {
  beforeEach(() => {
    mocks.fromTo.mockClear()
    mocks.play.mockClear()
    mocks.seek.mockClear()
    mocks.set.mockClear()
    mocks.setVolume.mockClear()
    mocks.stopPreview.mockClear()
    mocks.to.mockClear()
    mocks.togglePlayback.mockClear()
    mocks.pageTransitionActive = true
    mocks.query.data = undefined
    mocks.query.isSuccess = false
  })

  const entranceCalls = () =>
    mocks.fromTo.mock.calls.filter(([, from]) => from?.y === 12)

  it('请求成功后默认播放，并在首页遮罩结束后只入场一次', async () => {
    // Given 首页音乐仍在请求，页面加载遮罩仍显示
    const renderPlayer = () => (
      <FrontMusicPlayerProvider>
        <HeroMusicPlayer />
      </FrontMusicPlayerProvider>
    )
    const view = render(renderPlayer())
    expect(screen.queryByLabelText('头图音乐播放器')).not.toBeInTheDocument()

    // When 公开音乐请求成功
    mocks.query.data = {
      items: [
        {
          id: 1,
          title: 'Bloom',
          artist: null,
          audio_url: '/files/music/bloom.mp3',
          duration_ms: 155_000,
        },
        {
          id: 2,
          title: 'Morning',
          artist: null,
          audio_url: '/files/music/morning.mp3',
          duration_ms: 120_000,
        },
      ],
    }
    mocks.query.isSuccess = true
    view.rerender(renderPlayer())

    // Then 首页立即请求播放第一首，但遮罩期间不执行入场
    await waitFor(() =>
      expect(mocks.play).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        true,
      ),
    )
    expect(entranceCalls()).toHaveLength(0)

    // When 首页加载遮罩结束
    mocks.pageTransitionActive = false
    view.rerender(renderPlayer())

    // Then 播放器执行一次与头图同步的入场，切歌不重复整块入场
    expect(entranceCalls()).toHaveLength(1)
    expect(mocks.fromTo).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ autoAlpha: 0, y: 12, scale: 0.98 }),
      expect.objectContaining({
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.32,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '下一首' }))
    await waitFor(() =>
      expect(mocks.play).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 2 }),
      ),
    )
    expect(entranceCalls()).toHaveLength(1)
  })
})
