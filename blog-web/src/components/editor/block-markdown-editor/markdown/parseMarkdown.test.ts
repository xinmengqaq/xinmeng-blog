import { describe, expect, it } from 'vitest'

import { parseMarkdownToBlocks } from './parseMarkdown'

describe('Markdown 解析', () => {
  it('空 Markdown 应解析为一个段落块', () => {
    expect(parseMarkdownToBlocks('')).toEqual([
      { id: expect.any(String), type: 'paragraph', html: '' },
    ])
  })

  it('段落标题引用列表任务列表代码块图片分割线表格应解析为对应块', () => {
    const blocks = parseMarkdownToBlocks(`# 标题

普通 **段落**

> 引用

- 列表

- [x] 任务

\`\`\`ts
const value = 1
\`\`\`

![封面](https://example.com/a.png)

---

| 名称 | 数量 |
| :--- | ---: |
| 苹果 | 2 |`)

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'quote',
      'unordered-list',
      'task-list',
      'code',
      'image',
      'divider',
      'table',
    ])
    expect(blocks[1]).toMatchObject({ html: '普通 <strong>段落</strong>' })
    expect(blocks.at(-1)).toMatchObject({ type: 'table', hasHeader: true })
  })

  it('受限 HTML 表格应解析并保留安全结构', () => {
    const [table] = parseMarkdownToBlocks(
      '<table><tbody><tr><td rowspan="2" style="text-align:center" onclick="bad()">内容</td></tr></tbody></table>',
    )

    expect(table).toMatchObject({
      type: 'table',
      rows: [[{ html: '内容', rowspan: 2, colspan: 1, align: 'center' }]],
    })
  })
})
