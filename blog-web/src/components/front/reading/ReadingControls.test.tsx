import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReadingSettings } from './ReadingControls'

describe('阅读设置交互', () => {
  it('鼠标悬停在同组选项间移动时只响应当前按钮', () => {
    // Given 标准行高已经选中且鼠标尚未进入任何选项
    // When 鼠标依次从紧凑移动到舒展
    // Then 只有鼠标当前所在的舒展显示悬停反馈，标准仍只保持选中状态
    render(
      <ReadingSettings
        preferences={{ fontSize: 17, lineHeight: 1.9, contentWidth: 720 }}
        update={vi.fn()}
      />,
    )

    const compact = screen.getByRole('button', { name: '紧凑' })
    const standard = screen.getAllByRole('button', { name: '标准' })[0]
    const relaxed = screen.getByRole('button', { name: '舒展' })

    fireEvent.pointerEnter(compact)
    expect(compact).toHaveClass('is-hovered')

    fireEvent.pointerEnter(relaxed)
    expect(compact).not.toHaveClass('is-hovered')
    expect(relaxed).toHaveClass('is-hovered')
    expect(standard).not.toHaveClass('is-hovered')
    expect(standard).toHaveAttribute('aria-pressed', 'true')
  })
})
