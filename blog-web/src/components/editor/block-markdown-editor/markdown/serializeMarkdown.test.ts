import { describe, expect, it } from 'vitest'

import type { TableBlock } from '../types'
import { parseMarkdownToBlocks } from './parseMarkdown'
import { serializeBlocksToMarkdown } from './serializeMarkdown'

describe('Markdown 序列化', () => {
  it('块列表应序列化回 Markdown 并保留主要块类型', () => {
    const markdown = `# 标题

普通 **段落**

> 引用

- 列表

\`\`\`ts
const value = 1
\`\`\`

![封面](https://example.com/a.png)

---`
    const serialized = serializeBlocksToMarkdown(
      parseMarkdownToBlocks(markdown),
    )

    expect(serialized).toContain('# 标题')
    expect(serialized).toContain('普通 **段落**')
    expect(serialized).toContain('> 引用')
    expect(serialized).toContain('- 列表')
    expect(serialized).toContain('```ts')
    expect(serialized).toContain('![封面](https://example.com/a.png)')
    expect(serialized).toContain('---')
  })

  it('简单表格应序列化为 GFM 并保留列对齐和文本', () => {
    const table = parseMarkdownToBlocks(`| 名称 | 数量 |
| :--- | ---: |
| 苹果 | 2 |`)[0]
    const serialized = serializeBlocksToMarkdown([table])

    expect(serialized).toContain('| 名称 | 数量 |')
    expect(serialized).toContain('| --- | ---: |')
    expect(serialized).toContain('| 苹果 | 2 |')
  })

  it('复杂表格应序列化为受限 HTML', () => {
    const table: TableBlock = {
      id: 'table',
      type: 'table',
      hasHeader: true,
      columnWidths: ['160px', '25%'],
      rows: [
        [
          {
            id: 'a',
            html: '标题',
            rowspan: 1,
            colspan: 2,
            align: 'center',
          },
        ],
        [
          { id: 'b', html: '内容', rowspan: 1, colspan: 1, align: 'left' },
          { id: 'c', html: '2', rowspan: 1, colspan: 1, align: 'right' },
        ],
      ],
    }

    const serialized = serializeBlocksToMarkdown([table])
    expect(serialized).toContain('<table>')
    expect(serialized).toContain('style="width:160px"')
    expect(serialized).toContain('colspan="2"')
    expect(serialized).toContain('text-align:center')
  })

  it('下划线和预设颜色应经过解析与序列化后保持', () => {
    const markdown = '<u>下划线</u>\n\n<span style="color:#dc2626">红色</span>'

    expect(serializeBlocksToMarkdown(parseMarkdownToBlocks(markdown))).toBe(
      markdown,
    )
  })
})
