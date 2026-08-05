import { render, screen } from '@testing-library/react'

import { FrontFooter } from './FrontFooter'

describe('前台网站声明页脚', () => {
  it('展示非商业声明和开源免责', () => {
    render(<FrontFooter />)

    const footer = screen.getByRole('contentinfo', { name: '网站声明' })
    expect(footer).toHaveTextContent(
      '本站仅用于个人分享，无任何商业行为；如有侵权，请联系处理。',
    )
    expect(footer).toHaveTextContent(
      '本项目为开源项目，使用者须遵守法律法规，并自行承担使用产生的责任。',
    )
  })
})
