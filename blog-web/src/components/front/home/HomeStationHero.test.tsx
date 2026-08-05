import { render, waitFor } from '@testing-library/react'
import type { ReactNode, Ref } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { FrontPageTransitionContext } from '@/hooks/front/pageTransitionContext'
import { HomeStationHero } from './HomeStationHero'

const intro = vi.hoisted(() => ({
  play: vi.fn(() => ({ kill: vi.fn() })),
  shouldPlay: vi.fn(() => true),
  showFinal: vi.fn(),
}))

vi.mock('./homeStationIntro', () => ({
  playHomeIntro: intro.play,
  shouldPlayHomeIntro: intro.shouldPlay,
  showHomeIntroFinal: intro.showFinal,
}))

vi.mock('@/hooks/front/motionPreference', () => ({
  useFrontMotionPreference: () => ({ motionAllowed: true }),
}))

vi.mock('@/components/front/layout/FrontSiteBackground', () => ({
  FrontSiteBackground: () => <div />,
}))

vi.mock('@/components/front/layout/FrontSceneBanner', () => ({
  FrontSceneBanner: ({
    children,
    rootRef,
  }: {
    children: ReactNode
    rootRef: Ref<HTMLElement>
  }) => <section ref={rootRef}>{children}</section>,
}))

vi.mock('@/components/front/visual', () => ({
  FrontAssetImage: () => <span />,
  FrontBrandMark: () => <span />,
  FrontIcon: () => <span />,
}))

describe('首页站点开场', () => {
  it('圆环退出后才启动且不会反向等待开场动画', async () => {
    // Given 首页主请求仍在进行，圆环遮罩覆盖首屏
    const { rerender } = render(
      <FrontPageTransitionContext.Provider value>
        <HomeStationHero />
      </FrontPageTransitionContext.Provider>,
    )

    // Then 头图开场时间线尚未创建
    expect(intro.shouldPlay).not.toHaveBeenCalled()
    expect(intro.play).not.toHaveBeenCalled()

    // When 主请求完成并且圆环退出
    rerender(
      <FrontPageTransitionContext.Provider value={false}>
        <HomeStationHero />
      </FrontPageTransitionContext.Provider>,
    )

    // Then 头图独立启动自身动画，不向圆环提供完成条件
    await waitFor(() => expect(intro.play).toHaveBeenCalledOnce())
  })
})
