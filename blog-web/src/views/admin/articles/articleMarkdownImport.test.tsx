import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ArticleMarkdownImportControl } from './ArticleMarkdownImportControl'
import { normalizeArticleMarkdownImport } from './articleMarkdownImport'

const markdownFile = (name: string, content: string) =>
  Object.assign(new File([content], name, { type: 'text/markdown' }), {
    text: vi.fn().mockResolvedValue(content),
  })

describe('后台文章 Markdown 导入', () => {
  it('应将 Obsidian Markdown 解析为正文并忽略所有图片', () => {
    // Given 管理员选择了包含标题、表格、代码、callout、Wiki 链接和图片的 Obsidian Markdown 文件
    // When 前端在浏览器本地读取并解析这个文件
    // Then 正文保留可编辑的文字结构并转换 Obsidian 语法，同时不生成任何图片内容
    const markdown = `## 安装

| 组件 | 作用 |
| --- | --- |
| PostgreSQL | 服务端 |

\`\`\`sql
SELECT version();
\`\`\`

> [!warning] 常见误解
> - 第一项
> - 第二项

上一章：[[01-PostgreSQL 是什么]] · 下一章：[[03-基本结构|基本结构]]

![远程图片](https://example.com/postgres.png)

![引用图片][cover]

[cover]: ./cover.png

![[本地截图.png]]`

    const result = normalizeArticleMarkdownImport(markdown)

    expect(result).toContain('## 安装')
    expect(result).toContain('| PostgreSQL | 服务端 |')
    expect(result).toContain('```sql')
    expect(result).toContain('警告：常见误解')
    expect(result).toContain('- 第一项')
    expect(result).toContain('上一章：01-PostgreSQL 是什么')
    expect(result).toContain('下一章：基本结构')
    expect(result).not.toContain('远程图片')
    expect(result).not.toContain('引用图片')
    expect(result).not.toContain('cover.png')
    expect(result).not.toContain('本地截图.png')
  })

  it('应在管理员确认后用导入结果覆盖已有正文', async () => {
    // Given 当前正文已有未保存内容且管理员又选择了 Markdown 文件
    // When 管理员确认使用文件内容覆盖当前正文
    // Then 正文替换为解析结果并进入有未保存修改状态
    const onImport = vi.fn()
    render(
      <ArticleMarkdownImportControl
        currentContent="已有正文"
        onImport={onImport}
      />,
    )

    fireEvent.change(screen.getByLabelText('选择 Markdown 文件'), {
      target: { files: [markdownFile('note.md', '# 导入正文')] },
    })

    expect(await screen.findByText('覆盖当前正文')).toBeInTheDocument()
    expect(onImport).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '确认导入' }))

    expect(onImport).toHaveBeenCalledWith('# 导入正文')
    expect(screen.getByRole('status')).toHaveTextContent('已导入 note.md')
  })

  it('应在管理员取消覆盖时保留已有正文', async () => {
    // Given 当前正文已有内容并已出现导入覆盖确认
    // When 管理员取消覆盖
    // Then 文件内容不进入编辑器且当前正文保持不变
    const onImport = vi.fn()
    render(
      <ArticleMarkdownImportControl
        currentContent="已有正文"
        onImport={onImport}
      />,
    )

    fireEvent.change(screen.getByLabelText('选择 Markdown 文件'), {
      target: { files: [markdownFile('note.md', '# 导入正文')] },
    })
    fireEvent.click(await screen.findByRole('button', { name: '保留当前正文' }))

    expect(onImport).not.toHaveBeenCalled()
    expect(screen.queryByText('覆盖当前正文')).not.toBeInTheDocument()
  })

  it('应在文件无效或读取失败时提示错误并保留正文', async () => {
    // Given 管理员选择的不是 Markdown 文件或浏览器无法读取文件内容
    // When 前端处理本地文件
    // Then 页面给出可被辅助技术读出的错误提示且不改变当前正文
    const onImport = vi.fn()
    render(
      <ArticleMarkdownImportControl
        currentContent="已有正文"
        onImport={onImport}
      />,
    )

    fireEvent.change(screen.getByLabelText('选择 Markdown 文件'), {
      target: { files: [markdownFile('note.txt', '不是 Markdown')] },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '请选择 .md 文件',
    )
    expect(onImport).not.toHaveBeenCalled()

    const unreadableFile = Object.assign(
      new File(['正文'], 'broken.md', { type: 'text/markdown' }),
      { text: vi.fn().mockRejectedValue(new Error('read failed')) },
    )
    fireEvent.change(screen.getByLabelText('选择 Markdown 文件'), {
      target: { files: [unreadableFile] },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '无法读取 Markdown 文件，请重新选择',
    )
    expect(onImport).not.toHaveBeenCalled()
  })
})
