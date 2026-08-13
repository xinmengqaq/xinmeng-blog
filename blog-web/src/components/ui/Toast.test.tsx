import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Toast } from './Toast'

describe('全局 Toast', () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true }),
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('成功状态使用绿色语义并自动消失', () => {
    vi.useFakeTimers()
    render(<Toast message="保存成功" type="success" />)

    const toast = screen.getByRole('status')
    expect(toast).toHaveClass('ui-toast--success')
    expect(toast).toHaveTextContent('保存成功')

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('错误状态使用红色语义且允许手动关闭', () => {
    render(<Toast message="图形验证码错误" type="error" />)

    const toast = screen.getByRole('alert')
    expect(toast).toHaveClass('ui-toast--error')
    fireEvent.click(screen.getByRole('button', { name: '关闭提示' }))

    return waitFor(() => expect(toast).not.toBeInTheDocument())
  })
})
