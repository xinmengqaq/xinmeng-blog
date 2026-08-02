import { describe, expect, it } from 'vitest'

import { sanitizeEditorHtml } from './sanitizeHtml'

describe('Markdown HTML 清理', () => {
  it('受限 span 应保留颜色和背景高亮', () => {
    const clean = sanitizeEditorHtml(
      '<span style="color:#dc2626;background-color:#fef3c7;position:fixed">文字</span>',
    )

    expect(clean).toContain('color:#dc2626')
    expect(clean).toContain('background-color:#fef3c7')
    expect(clean).not.toContain('position')
  })

  it('下划线语义标签应保留且移除危险属性', () => {
    const clean = sanitizeEditorHtml('<u onclick="bad()">下划线</u>')

    expect(clean).toBe('<u>下划线</u>')
  })

  it('受限 table 应保留合并单元格列宽和对齐', () => {
    const clean = sanitizeEditorHtml(
      '<table><colgroup><col style="width:160px"></colgroup><tbody><tr><td rowspan="2" colspan="2" style="text-align:center">内容</td></tr></tbody></table>',
    )

    expect(clean).toContain('width:160px')
    expect(clean).toContain('rowspan="2"')
    expect(clean).toContain('colspan="2"')
    expect(clean).toContain('text-align:center')
  })

  it('危险 HTML 应被清理', () => {
    const clean = sanitizeEditorHtml(
      '<script>alert(1)</script><span onclick="alert(1)" style="color:red;background-image:url(x)">安全文字</span><iframe src="x"></iframe>',
    )

    expect(clean).toContain('安全文字')
    expect(clean).not.toMatch(
      /script|onclick|iframe|background-image|color:red/,
    )
  })

  it('后台允许的文字效果和复杂表格经过净化后应完整保留', () => {
    // Given 作者内容包含允许的文字颜色、高亮、下划线、对齐、跨行跨列表格和受限宽度
    const html =
      '<span style="color:#dc2626;background-color:#fef3c7"><u>文字</u></span><table><colgroup><col style="width:75%"></colgroup><tbody><tr><td rowspan="3" colspan="2" style="text-align:right">内容</td></tr></tbody></table>'

    // When 编辑器净化并保存这些富文本内容
    const clean = sanitizeEditorHtml(html)

    // Then 允许的文字效果、合并单元格、列宽和对齐信息应完整保留
    expect(clean).toContain(
      '<span style="color:#dc2626;background-color:#fef3c7"><u>文字</u></span>',
    )
    expect(clean).toContain('style="width:75%"')
    expect(clean).toContain('rowspan="3"')
    expect(clean).toContain('colspan="2"')
    expect(clean).toContain('style="text-align:right"')
  })

  it('危险标签属性样式和链接经过净化后应全部失效', () => {
    // Given 作者内容混入危险标签、事件属性、未知样式、背景图片和危险 URL
    const html =
      '<script>alert(1)</script><iframe src="https://example.com"></iframe><a href="javascript:alert(1)">链接文字</a><span onclick="alert(1)" style="color:red;position:fixed;background-image:url(javascript:alert(1));width:100vw">安全文字</span>'

    // When 编辑器净化这些富文本内容
    const clean = sanitizeEditorHtml(html)

    // Then 危险内容应被拒绝且其余安全文字和允许格式仍可阅读
    expect(clean).toContain('链接文字')
    expect(clean).toContain('安全文字')
    expect(clean).not.toMatch(
      /script|iframe|href|javascript:|onclick|color:red|position|background-image|100vw/,
    )
  })
})
