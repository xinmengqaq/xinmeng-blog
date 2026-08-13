import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AccountCaptchaField } from './AccountCaptchaField'

const renderField = (onImageError = vi.fn()) => {
  render(
    <AccountCaptchaField
      captcha={{ captchaId: 'captcha-1', imageBase64: 'aW1hZ2U=' }}
      code=""
      error={null}
      loading={false}
      onChange={vi.fn()}
      onImageError={onImageError}
      onRefresh={vi.fn()}
    />,
  )
  return onImageError
}

describe('前台账户图形验证码', () => {
  it('按后端 PNG Base64 契约生成可展示的 Data URL', () => {
    renderField()

    expect(screen.getByRole('img', { name: '图形验证码' })).toHaveAttribute(
      'src',
      'data:image/png;base64,aW1hZ2U=',
    )
  })

  it('图片解码失败时通知流程废弃当前验证码', () => {
    const onImageError = renderField()

    fireEvent.error(screen.getByRole('img', { name: '图形验证码' }))

    expect(onImageError).toHaveBeenCalledOnce()
  })
})
