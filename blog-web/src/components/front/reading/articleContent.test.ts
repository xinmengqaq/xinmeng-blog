import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ArticleContent } from './articleContent'
import { parseArticleContent } from './articleContentModel'

describe('公开文章正文处理', () => {
  it('Markdown 正文应生成安全 HTML 和稳定的 H2/H3 目录模型', () => {
    // Given 正文包含标题、段落、列表、表格、代码块、链接和危险 HTML
    // When 前台解析并净化公开文章正文
    const parsed = parseArticleContent(
      '# 标题\n\n<script>alert(1)</script>\n\n## 第一节\n\n正文 [危险](javascript:alert(1))',
    )
    // Then 支持的内容应保留、危险内容应移除且 H2/H3 应获得稳定唯一 ID
    expect(parsed.headings).toEqual([
      { id: '第一节', level: 2, text: '第一节' },
    ])
    expect(parsed.root.children.some((node) => node.type === 'html')).toBe(true)
  })

  it('重复标题应生成互不冲突的目录 ID', () => {
    // Given 正文包含文本相同的多个二级或三级标题
    // When 前台生成正文标题和目录模型
    const parsed = parseArticleContent(
      '## 重复标题\n\n### 重复标题\n\n## 重复标题',
    )
    // Then 每个标题应拥有可跳转且不重复的稳定 ID
    expect(parsed.headings.map((heading) => heading.id)).toEqual([
      '重复标题',
      '重复标题-2',
      '重复标题-3',
    ])
  })

  it('目录标题只显示可见文字，不泄漏安全行内 HTML 标签源码', () => {
    // Given 标题使用编辑器允许的 span 格式
    const parsed = parseArticleContent(
      '## 关于博客<span style="color:#dc2626">与阅读</span>',
    )

    // When 前台生成目录
    // Then 目录文字应去掉标签源码但保留可见标题
    expect(parsed.headings).toEqual([
      { id: '关于博客与阅读', level: 2, text: '关于博客与阅读' },
    ])
  })

  it('居中或右对齐的正文图片应继续显示并保留安全宽度', () => {
    // Given 编辑器输出的受限图片 HTML
    const parsed = parseArticleContent(
      '<p style="text-align:center"><img src="https://example.com/a.png" alt="封面" style="width:75%"></p>',
    )

    // When 前台渲染正文
    const { container } = render(ArticleContent({ parsed }))

    // Then 图片仍存在，位置和百分比宽度都保留
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/a.png',
    )
    expect(container.querySelector('img')).toHaveStyle({ width: '75%' })
    expect(container.querySelector('.reading-image p')).toHaveStyle({
      textAlign: 'center',
    })
  })

  it('正文首个一级标题与文章标题相同时只保留页面头部标题', () => {
    // Given 页面已经单独展示文章标题，Markdown 正文首项又是同名一级标题
    // When 前台解析正文
    const parsed = parseArticleContent(
      '# Spring Boot 博客后台学习记录\n\n正文内容',
      'Spring Boot 博客后台学习记录',
    )
    // Then 正文不再重复渲染同名一级标题，后续正文保持不变
    expect(parsed.root.children[0]?.type).toBe('paragraph')
    expect(parsed.root.children).toHaveLength(1)
  })

  it('后台允许的作者格式和复杂表格应在公开文章中完整显示', () => {
    // Given 文章包含编辑器允许的文字颜色、高亮、下划线、对齐、跨行跨列表格和受限宽度
    const parsed = parseArticleContent(`
<span style="color:#dc2626;background-color:#fef3c7">彩色<u>下划线</u></span>

<table><colgroup><col style="width:160px"></colgroup><tbody><tr><td rowspan="2" colspan="2" style="text-align:center">合并单元格</td></tr></tbody></table>
`)

    // When 访客打开文章详情并阅读公开正文
    const { container } = render(ArticleContent({ parsed }))

    // Then 作者设置的允许格式和复杂表格应完整显示且不被主题基础排版覆盖
    const formatted = screen.getByText('彩色', { exact: false }).closest('span')
    expect(formatted).toHaveStyle({
      color: '#dc2626',
      backgroundColor: '#fef3c7',
    })
    expect(screen.getByText('下划线').closest('u')).not.toBeNull()
    const cell = screen.getByText('合并单元格').closest('td')
    expect(cell).toHaveAttribute('rowspan', '2')
    expect(cell).toHaveAttribute('colspan', '2')
    expect(cell).toHaveStyle({ textAlign: 'center' })
    expect(container.querySelector('col')).toHaveStyle({ width: '160px' })
  })

  it('危险富文本被清理后目录和代码块仍应保持可用', () => {
    // Given 文章混入危险 HTML、事件属性、未知样式和危险 URL，同时包含安全标题与代码块
    const parsed = parseArticleContent(`
<script>window.__unsafe = true</script>

<span onclick="window.__unsafe = true" style="color:red;position:fixed;background-image:url(javascript:alert(1))">安全文字</span>

[危险链接](javascript:alert(1))

## 安全目录

\`\`\`ts
const safe = true
\`\`\`
`)

    // When 前台在公开阅读边界解析并净化文章正文
    const { container } = render(ArticleContent({ parsed }))

    // Then 危险内容不应进入 DOM，安全文字、目录跳转和代码块复制所需内容应保持可用
    expect(screen.getByText('安全文字')).toBeInTheDocument()
    expect(container.querySelector('script, iframe')).toBeNull()
    expect(container.innerHTML).not.toMatch(
      /onclick|position:fixed|background-image|javascript:/,
    )
    expect(screen.getByRole('heading', { name: '安全目录' })).toHaveAttribute(
      'id',
      '安全目录',
    )
    expect(
      container.querySelector('code.language-typescript'),
    ).toHaveTextContent('const safe = true')
    expect(screen.getByRole('button', { name: '复制代码' })).toBeInTheDocument()
  })
})
