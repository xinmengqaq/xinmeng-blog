import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AdminAvatar } from './AdminAvatar'

describe('AdminAvatar', () => {
  it('头像图片加载失败时回退为纯色占位', () => {
    render(
      <AdminAvatar label="管理员头像" src="https://example.com/avatar.png" />,
    )

    const avatar = screen.getByLabelText('管理员头像')
    const image = avatar.querySelector('img')

    expect(image).not.toBeNull()
    fireEvent.error(image!)
    expect(avatar.querySelector('img')).toBeNull()
  })
})
