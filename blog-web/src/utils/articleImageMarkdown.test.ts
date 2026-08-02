import { describe, expect, it } from 'vitest'
import {
  extractImageUrlsFromContent,
  getRemovedImageUrls,
  replaceImageUrlsInContent,
} from './articleImageMarkdown'

describe('Task 7: 图片草稿 AST 和对象 URL 生命周期', () => {
  it('只提取 Markdown 图片节点，并只替换图片地址', () => {
    // Given 文章正文包含图片
    // When 提取和比较 AST
    // Then 正文块使用 blob URL 占位，移除操作计算差集
    const previewUrl = 'blob:local-preview'
    const content = [
      `![正文图](${previewUrl})`,
      `[普通链接](${previewUrl})`,
      `\`${previewUrl}\``,
    ].join('\n\n')
    const finalUrl = 'https://files.example.com/final.jpg'

    expect(extractImageUrlsFromContent(content)).toEqual([previewUrl])

    const replaced = replaceImageUrlsInContent(
      content,
      new Map([[previewUrl, finalUrl]]),
    )
    expect(extractImageUrlsFromContent(replaced)).toEqual([finalUrl])
    expect(replaced).toContain(`[普通链接](${previewUrl})`)
    expect(replaced).toContain(`\`${previewUrl}\``)
  })

  it('初始正文与当前正文的差集只返回已移除的线上图片', () => {
    // Given 初始正文包含保留图和待移除图
    // When 计算移除差集
    // Then 返回当前正文已不存在的线上图片 URL
    const retainedUrl = 'https://files.example.com/retained.jpg'
    const removedUrl = 'http://example.com/old-image.jpg'
    const initialContent = `![保留图](${retainedUrl})\n\n![待移除图](${removedUrl})`
    const currentContent = `![保留图](${retainedUrl})\n\n![新草稿](blob:new-preview)`

    expect(getRemovedImageUrls(initialContent, currentContent)).toEqual([
      removedUrl,
    ])
    expect(getRemovedImageUrls(initialContent, initialContent)).toEqual([])
  })
})
