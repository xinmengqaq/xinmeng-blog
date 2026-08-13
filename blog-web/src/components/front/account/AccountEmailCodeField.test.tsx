import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AccountEmailCodeField } from './AccountEmailCodeField'

describe('账户邮件验证码行', () => {
  it('发码后在输入框右侧显示重发倒计时', () => {
    render(
      <AccountEmailCodeField
        code=""
        id="email-code"
        onChange={vi.fn()}
        onRequestNew={vi.fn()}
        resendSeconds={56}
      />,
    )

    expect(screen.getByLabelText(/^邮件验证码/)).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('56 秒后重发')
    expect(
      screen.queryByRole('button', { name: '重新获取' }),
    ).not.toBeInTheDocument()
  })

  it('倒计时结束后允许返回图形验证码阶段', () => {
    const onRequestNew = vi.fn()
    render(
      <AccountEmailCodeField
        code="123456"
        id="email-code"
        onChange={vi.fn()}
        onRequestNew={onRequestNew}
        resendSeconds={0}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '重新获取' }))

    expect(onRequestNew).toHaveBeenCalledOnce()
  })
})
