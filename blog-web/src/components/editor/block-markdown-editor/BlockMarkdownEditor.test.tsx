import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ImageDraft } from '@/types/file'

import { BlockMarkdownEditor } from './BlockMarkdownEditor'

const selectText = (element: HTMLElement) => {
  const text = element.firstChild
  if (!text) throw new Error('缺少可选择文字')
  const range = document.createRange()
  range.selectNodeContents(text)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  act(() => document.dispatchEvent(new Event('selectionchange')))
}

const selectContents = (element: HTMLElement) => {
  const range = document.createRange()
  range.selectNodeContents(element)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  act(() => document.dispatchEvent(new Event('selectionchange')))
}

describe('BlockMarkdownEditor', () => {
  it('应在连续画布中渲染基础 Markdown 块', () => {
    render(
      <BlockMarkdownEditor
        value={
          '# 标题\n\n普通段落\n\n> 引用\n\n- 列表\n\n```ts\nconst a = 1\n```'
        }
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: '标题' })).toBeInTheDocument()
    expect(screen.getByText('普通段落')).toBeInTheDocument()
    expect(screen.getByText('引用')).toBeInTheDocument()
    expect(screen.getByText('列表')).toBeInTheDocument()
    expect(screen.getByLabelText('代码内容')).toHaveValue('const a = 1')
  })

  it('编辑段落时应输出序列化后的 Markdown', () => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="原文" onChange={onChange} />)
    const paragraph = screen.getByText('原文')

    paragraph.innerHTML = '修改后的 <strong>正文</strong>'
    fireEvent.input(paragraph)

    expect(onChange).toHaveBeenLastCalledWith('修改后的 **正文**')
  })

  it('readOnly 时应禁止编辑并隐藏块创建入口', () => {
    render(<BlockMarkdownEditor value="只读正文" onChange={vi.fn()} readOnly />)

    expect(screen.getByText('只读正文')).toHaveAttribute(
      'contenteditable',
      'false',
    )
    expect(
      screen.queryByRole('button', { name: '在此块后插入' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '打开块工具' }),
    ).not.toBeInTheDocument()
  })

  it('块旁加号应打开菜单并插入所选块', () => {
    render(<BlockMarkdownEditor value="正文" onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '在此块后插入' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '二级标题' }))

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('空段落输入斜杠应保留普通文字输入', () => {
    const { container } = render(
      <BlockMarkdownEditor value="" onChange={vi.fn()} />,
    )
    const paragraph = container.querySelector<HTMLElement>(
      '[data-editor-input]',
    )!

    const allowed = fireEvent.keyDown(paragraph, { key: '/' })

    expect(allowed).toBe(true)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('Enter 应按光标位置拆分普通段落', () => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="前半段后半段" onChange={onChange} />)
    const paragraph = screen.getByText('前半段后半段')
    const textNode = paragraph.firstChild!
    const selection = window.getSelection()!
    const range = document.createRange()
    range.setStart(textNode, 3)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)

    fireEvent.keyDown(paragraph, { key: 'Enter' })

    expect(onChange).toHaveBeenLastCalledWith('前半段\n\n后半段')
  })

  it('输入法组合态按 Enter 应交给输入法确认候选词', () => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="输入中" onChange={onChange} />)
    const paragraph = screen.getByText('输入中')

    const allowed = fireEvent.keyDown(paragraph, {
      key: 'Enter',
      isComposing: true,
    })

    expect(allowed).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('不再占用浏览器常用的 Ctrl+E 和 Ctrl+Shift+D', () => {
    render(<BlockMarkdownEditor value="正文" onChange={vi.fn()} />)
    const paragraph = screen.getByText('正文')
    selectText(paragraph)

    expect(fireEvent.keyDown(paragraph, { key: 'e', ctrlKey: true })).toBe(true)
    expect(
      fireEvent.keyDown(paragraph, {
        key: 'd',
        ctrlKey: true,
        shiftKey: true,
      }),
    ).toBe(true)
  })

  it('输入 Markdown 快捷语法应转换当前段落块', () => {
    const { container } = render(
      <BlockMarkdownEditor value="" onChange={vi.fn()} />,
    )
    const paragraph = container.querySelector<HTMLElement>(
      '[data-editor-input]',
    )!

    paragraph.innerHTML = '## '
    fireEvent.input(paragraph)

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('选中块应显示块工具浮层', () => {
    const { container } = render(
      <BlockMarkdownEditor value="正文" onChange={vi.fn()} />,
    )
    const block = container.querySelector<HTMLElement>('.block-editor__block')!

    fireEvent.click(within(block).getByRole('button', { name: '打开块工具' }))

    const toolbar = screen.getByRole('toolbar', { name: '块工具' })
    expect(toolbar).toBeInTheDocument()
    expect(toolbar).toHaveStyle({ position: 'fixed' })
    expect(container.querySelectorAll('.block-editor__block')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '上移块' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下移块' })).toBeDisabled()
  })

  it('块工具应支持切换块类型', () => {
    render(<BlockMarkdownEditor value="正文" onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '打开块工具' }))
    fireEvent.click(screen.getByRole('button', { name: '切换为二级标题' }))

    expect(
      screen.getByRole('heading', { level: 2, name: '正文' }),
    ).toBeInTheDocument()
  })

  it('块工具应支持移动、复制和删除块', () => {
    const onChange = vi.fn()
    const { container } = render(
      <BlockMarkdownEditor value={'第一段\n\n第二段'} onChange={onChange} />,
    )

    const openFirstBlockToolbar = () => {
      const firstBlock = container.querySelectorAll<HTMLElement>(
        '.block-editor__block',
      )[0]
      fireEvent.click(
        within(firstBlock).getByRole('button', { name: '打开块工具' }),
      )
    }

    openFirstBlockToolbar()
    fireEvent.click(screen.getByRole('button', { name: '下移块' }))
    expect(onChange).toHaveBeenLastCalledWith('第二段\n\n第一段')

    openFirstBlockToolbar()
    fireEvent.click(screen.getByRole('button', { name: '复制块' }))
    expect(onChange).toHaveBeenLastCalledWith('第二段\n\n第二段\n\n第一段')

    openFirstBlockToolbar()
    fireEvent.click(screen.getByRole('button', { name: '删除块' }))
    expect(onChange).toHaveBeenLastCalledWith('第二段\n\n第一段')
  })

  it('文档只有一个空段落时块工具应禁止删除', () => {
    render(<BlockMarkdownEditor value="" onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '打开块工具' }))

    expect(screen.getByRole('button', { name: '删除块' })).toBeDisabled()
  })

  it('块工具应支持在当前块后插入语义块', () => {
    render(<BlockMarkdownEditor value="正文" onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '打开块工具' }))
    fireEvent.click(screen.getByRole('button', { name: '插入代码块' }))

    expect(screen.getByLabelText('代码内容')).toBeInTheDocument()
  })

  it('Esc 应只关闭当前块工具浮层', () => {
    render(<BlockMarkdownEditor value="正文" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '打开块工具' }))

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(
      screen.queryByRole('toolbar', { name: '块工具' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('正文')).toBeInTheDocument()
  })

  it('选中文字应显示文字工具浮层', () => {
    render(<BlockMarkdownEditor value="正文" onChange={vi.fn()} />)

    selectText(screen.getByText('正文'))

    expect(
      screen.getByRole('toolbar', { name: '文字工具' }),
    ).toBeInTheDocument()
  })

  it('右键文字时应选中当前词并打开文字工具浮层', () => {
    render(<BlockMarkdownEditor value="右键测试" onChange={vi.fn()} />)
    const paragraph = screen.getByText('右键测试')
    const textNode = paragraph.firstChild!
    const caret = document.createRange()
    caret.setStart(textNode, 1)
    caret.collapse(true)
    window.getSelection()?.removeAllRanges()

    Object.defineProperty(document, 'caretRangeFromPoint', {
      configurable: true,
      value: () => caret,
    })
    const mouseDown = createEvent.mouseDown(paragraph, {
      button: 2,
      clientX: 10,
      clientY: 10,
    })
    fireEvent(paragraph, mouseDown)
    const contextMenu = createEvent.contextMenu(paragraph, {
      clientX: 10,
      clientY: 10,
    })
    fireEvent(paragraph, contextMenu)
    Reflect.deleteProperty(document, 'caretRangeFromPoint')

    expect(mouseDown.defaultPrevented).toBe(true)
    expect(contextMenu.defaultPrevented).toBe(true)
    expect(window.getSelection()?.anchorOffset).toBe(1)
    expect(
      screen.getByRole('toolbar', { name: '文字工具' }),
    ).toBeInTheDocument()
  })

  it('点击文字工具外部时应关闭文字工具浮层', () => {
    render(
      <>
        <button type="button">外部操作</button>
        <BlockMarkdownEditor value="正文" onChange={vi.fn()} />
      </>,
    )
    selectText(screen.getByText('正文'))

    fireEvent.pointerDown(screen.getByRole('button', { name: '外部操作' }))

    expect(
      screen.queryByRole('toolbar', { name: '文字工具' }),
    ).not.toBeInTheDocument()
    expect(window.getSelection()?.rangeCount).toBe(0)
  })

  it('点击文字工具选项时不应在执行命令前关闭浮层', () => {
    render(<BlockMarkdownEditor value="正文" onChange={vi.fn()} />)
    selectText(screen.getByText('正文'))

    fireEvent.pointerDown(screen.getByRole('button', { name: '加粗' }))

    expect(
      screen.getByRole('toolbar', { name: '文字工具' }),
    ).toBeInTheDocument()
  })

  it('点击浮层外部时应关闭块工具、插入菜单和快捷键抽屉', () => {
    render(
      <>
        <button type="button">外部操作</button>
        <BlockMarkdownEditor value="正文" onChange={vi.fn()} />
      </>,
    )
    const outside = screen.getByRole('button', { name: '外部操作' })

    fireEvent.click(screen.getByRole('button', { name: '打开块工具' }))
    expect(screen.getByRole('toolbar', { name: '块工具' })).toBeInTheDocument()
    fireEvent.pointerDown(outside)
    expect(
      screen.queryByRole('toolbar', { name: '块工具' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '在此块后插入' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.pointerDown(outside)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '打开快捷键概览' }))
    expect(
      screen.getByRole('dialog', { name: '快捷键概览' }),
    ).toBeInTheDocument()
    fireEvent.pointerDown(outside)
    expect(
      screen.queryByRole('dialog', { name: '快捷键概览' }),
    ).not.toBeInTheDocument()
  })

  it.each([
    ['加粗', '**正文**'],
    ['斜体', '*正文*'],
    ['下划线', '<u>正文</u>'],
    ['删除线', '~~正文~~'],
    ['行内代码', '`正文`'],
  ])('文字工具执行%s后应输出安全格式', (name, markdown) => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="正文" onChange={onChange} />)
    selectText(screen.getByText('正文'))

    fireEvent.mouseDown(screen.getByRole('button', { name }))
    fireEvent.click(screen.getByRole('button', { name }))

    expect(onChange).toHaveBeenLastCalledWith(markdown)
  })

  it('文字工具应支持设置和取消安全链接', () => {
    const onChange = vi.fn()
    vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/article')
    const { unmount } = render(
      <BlockMarkdownEditor value="正文" onChange={onChange} />,
    )
    selectText(screen.getByText('正文'))

    fireEvent.mouseDown(screen.getByRole('button', { name: '设置链接' }))
    fireEvent.click(screen.getByRole('button', { name: '设置链接' }))
    expect(onChange).toHaveBeenLastCalledWith(
      '[正文](https://example.com/article)',
    )

    unmount()
    render(
      <BlockMarkdownEditor
        value="[正文](https://example.com/article)"
        onChange={onChange}
      />,
    )
    selectText(screen.getByText('正文'))
    fireEvent.mouseDown(screen.getByRole('button', { name: '取消链接' }))
    fireEvent.click(screen.getByRole('button', { name: '取消链接' }))
    expect(onChange).toHaveBeenLastCalledWith('正文')
  })

  it('文字工具应拒绝危险链接协议', () => {
    const onChange = vi.fn()
    vi.spyOn(window, 'prompt').mockReturnValue('javascript:alert(1)')
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined)
    render(<BlockMarkdownEditor value="正文" onChange={onChange} />)
    selectText(screen.getByText('正文'))

    fireEvent.mouseDown(screen.getByRole('button', { name: '设置链接' }))
    fireEvent.click(screen.getByRole('button', { name: '设置链接' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(alert).toHaveBeenCalledOnce()
  })

  it('文字工具应只应用预设文字颜色和背景高亮', () => {
    const onChange = vi.fn()
    const { unmount } = render(
      <BlockMarkdownEditor value="正文" onChange={onChange} />,
    )
    selectText(screen.getByText('正文'))

    fireEvent.mouseDown(screen.getByRole('button', { name: '文字颜色' }))
    fireEvent.click(screen.getByRole('button', { name: '文字颜色' }))
    fireEvent.mouseDown(
      screen.getByRole('button', { name: '文字颜色 #dc2626' }),
    )
    fireEvent.click(screen.getByRole('button', { name: '文字颜色 #dc2626' }))
    expect(onChange).toHaveBeenLastCalledWith(
      '<span style="color:#dc2626">正文</span>',
    )

    unmount()
    render(<BlockMarkdownEditor value="正文" onChange={onChange} />)
    selectText(screen.getByText('正文'))
    fireEvent.mouseDown(screen.getByRole('button', { name: '背景高亮' }))
    fireEvent.click(screen.getByRole('button', { name: '背景高亮' }))
    fireEvent.mouseDown(
      screen.getByRole('button', { name: '背景高亮 #fef3c7' }),
    )
    fireEvent.click(screen.getByRole('button', { name: '背景高亮 #fef3c7' }))
    expect(onChange).toHaveBeenLastCalledWith(
      '<span style="background-color:#fef3c7">正文</span>',
    )
  })

  it('文字工具应清除当前文字的行内格式', () => {
    const onChange = vi.fn()
    render(
      <BlockMarkdownEditor
        value={'**<u><span style="color:#dc2626">正文</span></u>**'}
        onChange={onChange}
      />,
    )
    selectText(screen.getByText('正文'))

    fireEvent.mouseDown(screen.getByRole('button', { name: '清除格式' }))
    fireEvent.click(screen.getByRole('button', { name: '清除格式' }))

    expect(onChange).toHaveBeenLastCalledWith('正文')
  })

  it('文字工具应清除跨多个行内节点的格式', () => {
    const onChange = vi.fn()
    const { container } = render(
      <BlockMarkdownEditor value="**粗体** *斜体*" onChange={onChange} />,
    )
    selectContents(container.querySelector<HTMLElement>('[data-editor-input]')!)

    fireEvent.mouseDown(screen.getByRole('button', { name: '清除格式' }))
    fireEvent.click(screen.getByRole('button', { name: '清除格式' }))

    expect(onChange).toHaveBeenLastCalledWith('粗体 斜体')
  })

  it('Esc 应关闭文字工具浮层并保留正文', () => {
    render(<BlockMarkdownEditor value="正文" onChange={vi.fn()} />)
    selectText(screen.getByText('正文'))

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(
      screen.queryByRole('toolbar', { name: '文字工具' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('正文')).toBeInTheDocument()
  })

  it('编辑器外选区和只读状态不应显示文字工具', () => {
    const { rerender } = render(
      <>
        <span>外部文字</span>
        <BlockMarkdownEditor value="正文" onChange={vi.fn()} />
      </>,
    )
    selectText(screen.getByText('外部文字'))
    expect(
      screen.queryByRole('toolbar', { name: '文字工具' }),
    ).not.toBeInTheDocument()

    rerender(<BlockMarkdownEditor value="正文" onChange={vi.fn()} readOnly />)
    selectText(screen.getByText('正文'))
    expect(
      screen.queryByRole('toolbar', { name: '文字工具' }),
    ).not.toBeInTheDocument()
  })

  it('列表项应支持两级缩进和反向缩进', () => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value={'- 父项\n- 子项'} onChange={onChange} />)
    const child = screen.getByText('子项')

    fireEvent.keyDown(child, { key: 'Tab' })
    expect(onChange).toHaveBeenLastCalledWith('- 父项\n  - 子项')

    fireEvent.keyDown(child, { key: 'Tab' })
    fireEvent.keyDown(child, { key: 'Tab' })
    expect(onChange).toHaveBeenLastCalledWith('- 父项\n    - 子项')

    fireEvent.keyDown(child, { key: 'Tab', shiftKey: true })
    expect(onChange).toHaveBeenLastCalledWith('- 父项\n  - 子项')
  })

  it('Enter 应在当前列表项后创建同级项', () => {
    const onChange = vi.fn()
    const { container } = render(
      <BlockMarkdownEditor value={'- 第一项\n- 第二项'} onChange={onChange} />,
    )

    fireEvent.keyDown(screen.getByText('第一项'), { key: 'Enter' })

    expect(
      container.querySelectorAll('.block-editor__list [data-editor-input]'),
    ).toHaveLength(3)
    expect(onChange).toHaveBeenLastCalledWith('- 第一项\n- \n- 第二项')
  })

  it('列表项 Enter 应按光标位置拆分前后文字', () => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="- 前半段后半段" onChange={onChange} />)
    const item = screen.getByText('前半段后半段')
    const textNode = item.firstChild!
    const selection = window.getSelection()!
    const range = document.createRange()
    range.setStart(textNode, 3)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)

    fireEvent.keyDown(item, { key: 'Enter' })

    expect(onChange).toHaveBeenLastCalledWith('- 前半段\n- 后半段')
  })

  it('空列表项按 Backspace 应退出为段落', () => {
    const onChange = vi.fn()
    const { container } = render(
      <BlockMarkdownEditor value={'- 第一项\n- 临时项'} onChange={onChange} />,
    )
    const item = screen.getByText('临时项')
    item.innerHTML = ''
    fireEvent.input(item)

    fireEvent.keyDown(item, { key: 'Backspace' })

    expect(container.querySelectorAll('.block-editor__list li')).toHaveLength(1)
    expect(
      container.querySelector('.block-editor__paragraph'),
    ).toBeInTheDocument()
  })

  it('空列表项按 Enter 应退出为段落', () => {
    const onChange = vi.fn()
    const { container } = render(
      <BlockMarkdownEditor value={'- 第一项\n- 临时项'} onChange={onChange} />,
    )
    const item = screen.getByText('临时项')
    item.innerHTML = ''
    fireEvent.input(item)

    fireEvent.keyDown(item, { key: 'Enter' })

    expect(container.querySelectorAll('.block-editor__list li')).toHaveLength(1)
    expect(
      container.querySelector('.block-editor__paragraph'),
    ).toBeInTheDocument()
  })

  it('任务列表勾选后应保存完成状态', () => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="- [ ] 待办" onChange={onChange} />)

    fireEvent.click(screen.getByRole('checkbox', { name: '任务 1' }))

    expect(onChange).toHaveBeenLastCalledWith('- [x] 待办')
  })

  it('右键表格应显示表格工具浮窗', () => {
    render(
      <BlockMarkdownEditor
        value={'| A | B |\n| --- | --- |\n| C | D |'}
        onChange={vi.fn()}
      />,
    )

    fireEvent.contextMenu(screen.getByText('A'))

    expect(screen.getByRole('menu', { name: '表格工具' })).toBeInTheDocument()
    expect(screen.getByText('A').closest('th')).toHaveClass('is-selected')
  })

  it('点击表格工具外部或按 Escape 时应关闭表格工具浮窗', () => {
    render(
      <>
        <button type="button">外部操作</button>
        <BlockMarkdownEditor
          value={'| A | B |\n| --- | --- |\n| C | D |'}
          onChange={vi.fn()}
        />
      </>,
    )
    const outside = screen.getByRole('button', { name: '外部操作' })

    fireEvent.contextMenu(screen.getByText('A'))
    fireEvent.pointerDown(outside)
    expect(
      screen.queryByRole('menu', { name: '表格工具' }),
    ).not.toBeInTheDocument()

    fireEvent.contextMenu(screen.getByText('A'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(
      screen.queryByRole('menu', { name: '表格工具' }),
    ).not.toBeInTheDocument()
  })

  it('Tab 和 Shift + Tab 应在表格单元格间移动焦点', () => {
    render(
      <BlockMarkdownEditor
        value={'| A | B |\n| --- | --- |\n| C | D |'}
        onChange={vi.fn()}
      />,
    )
    const first = screen.getByText('A')
    const second = screen.getByText('B')
    first.focus()

    fireEvent.keyDown(first, { key: 'Tab' })
    expect(second).toHaveFocus()

    fireEvent.keyDown(second, { key: 'Tab', shiftKey: true })
    expect(first).toHaveFocus()
  })

  it.each([
    ['插入上方行', 3, 2],
    ['插入下方行', 3, 2],
    ['插入左侧列', 2, 3],
    ['插入右侧列', 2, 3],
    ['删除当前行', 1, 2],
    ['删除当前列', 2, 1],
  ])('表格工具执行%s后应更新表格结构', (action, rows, columns) => {
    const { container } = render(
      <BlockMarkdownEditor
        value={'| A | B |\n| --- | --- |\n| C | D |'}
        onChange={vi.fn()}
      />,
    )
    fireEvent.contextMenu(screen.getByText('C'))

    fireEvent.click(screen.getByRole('menuitem', { name: action }))

    expect(container.querySelectorAll('.block-editor__table tr')).toHaveLength(
      rows,
    )
    expect(
      container.querySelectorAll('.block-editor__table tr')[0].children,
    ).toHaveLength(columns)
  })

  it('连续单元格应支持合并和拆分', () => {
    const onChange = vi.fn()
    const { unmount } = render(
      <BlockMarkdownEditor
        value={'| A | B |\n| --- | --- |\n| C | D |'}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByText('A'))
    fireEvent.click(screen.getByText('B'), { shiftKey: true })
    fireEvent.contextMenu(screen.getByText('B'))

    fireEvent.click(screen.getByRole('menuitem', { name: '合并单元格' }))

    expect(screen.getByText('A').closest('th')).toHaveAttribute('colspan', '2')
    expect(onChange).toHaveBeenLastCalledWith(
      expect.stringContaining('colspan="2"'),
    )

    unmount()
    const { container: splitContainer } = render(
      <BlockMarkdownEditor
        value={
          '<table><thead><tr><th colspan="2">A</th></tr></thead><tbody><tr><td>C</td><td>D</td></tr></tbody></table>'
        }
        onChange={onChange}
      />,
    )
    fireEvent.contextMenu(screen.getByText('A'))
    fireEvent.click(screen.getByRole('menuitem', { name: '拆分单元格' }))

    expect(
      splitContainer.querySelectorAll('.block-editor__table tr')[0].children,
    ).not.toHaveLength(1)
  })

  it('表格工具应支持表头、对齐和清空内容', () => {
    const onChange = vi.fn()
    const { container, unmount } = render(
      <BlockMarkdownEditor
        value={'| A | B |\n| --- | --- |\n| C | D |'}
        onChange={onChange}
      />,
    )
    fireEvent.contextMenu(screen.getByText('A'))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: '表头' }))
    expect(
      container.querySelector('.block-editor__table th'),
    ).not.toBeInTheDocument()

    unmount()
    render(
      <BlockMarkdownEditor
        value={'| A | B |\n| --- | --- |\n| C | D |'}
        onChange={onChange}
      />,
    )
    fireEvent.contextMenu(screen.getByText('C'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: '居中对齐' }))
    expect(screen.getByText('C').closest('td')).toHaveStyle({
      textAlign: 'center',
    })

    fireEvent.contextMenu(screen.getByText('C'))
    fireEvent.click(screen.getByRole('menuitem', { name: '清空单元格' }))
    expect(screen.queryByText('C')).not.toBeInTheDocument()
  })

  it('删除表格后应保留可编辑空段落', () => {
    const { container } = render(
      <BlockMarkdownEditor
        value={'| A | B |\n| --- | --- |\n| C | D |'}
        onChange={vi.fn()}
      />,
    )
    fireEvent.contextMenu(screen.getByText('A'))

    fireEvent.click(screen.getByRole('menuitem', { name: '删除表格' }))

    expect(
      container.querySelector('.block-editor__table'),
    ).not.toBeInTheDocument()
    expect(
      container.querySelector('.block-editor__paragraph'),
    ).toBeInTheDocument()
  })

  it('表格边缘加号和列宽拖拽应更新结构化数据', () => {
    const onChange = vi.fn()
    const { container } = render(
      <BlockMarkdownEditor
        value={'| A | B |\n| --- | --- |\n| C | D |'}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '在第 1 行上方插入' }))
    expect(container.querySelectorAll('.block-editor__table tr')).toHaveLength(
      3,
    )

    const resizeHandle = screen.getByRole('separator', {
      name: '调整第 1 列宽度',
    })
    fireEvent.mouseDown(resizeHandle, { clientX: 100 })
    fireEvent.mouseMove(window, { clientX: 180 })
    fireEvent.mouseUp(window)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.stringContaining('style="width:240px"'),
    )
  })

  it('粘贴 Markdown 应解析为块并插入当前块后', () => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="当前段落" onChange={onChange} />)

    fireEvent.paste(screen.getByText('当前段落'), {
      clipboardData: {
        types: ['text/markdown', 'text/plain'],
        getData: (type: string) =>
          type === 'text/markdown' ? '## 粘贴标题\n\n粘贴正文' : '',
      },
    })

    expect(
      screen.getByRole('heading', { name: '粘贴标题' }),
    ).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(
      '当前段落\n\n## 粘贴标题\n\n粘贴正文',
    )
  })

  it('粘贴纯文本应按空行拆段且保留单换行', () => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="当前段落" onChange={onChange} />)

    fireEvent.paste(screen.getByText('当前段落'), {
      clipboardData: {
        types: ['text/plain'],
        getData: () => '第一行\n第二行\n\n下一段',
      },
    })

    expect(onChange).toHaveBeenLastCalledWith(
      '当前段落\n\n第一行  \n第二行\n\n下一段',
    )
  })

  it('粘贴 HTML 应保留安全格式并移除危险内容', () => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="当前段落" onChange={onChange} />)

    fireEvent.paste(screen.getByText('当前段落'), {
      clipboardData: {
        types: ['text/html', 'text/plain'],
        getData: (type: string) =>
          type === 'text/html'
            ? '<p><strong>安全内容</strong><script>alert(1)</script></p>'
            : '',
      },
    })

    expect(onChange).toHaveBeenLastCalledWith('当前段落\n\n**安全内容**')
    expect(onChange.mock.lastCall?.[0]).not.toContain('alert')
  })

  it('粘贴图片应拒绝生成地址且不影响普通文本粘贴', () => {
    // Given 剪贴板同时可能包含图片和普通文本内容
    // When 管理员在正文编辑器中执行粘贴
    // Then 图片不上传也不生成本地地址，编辑器提示使用上传按钮且普通文本仍可正常插入
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="当前段落" onChange={onChange} />)
    const editor = screen.getByText('当前段落')
    const image = new File(['image'], 'pasted.png', { type: 'image/png' })

    fireEvent.paste(editor, {
      clipboardData: {
        files: [image],
        getData: () => '不应随图片插入',
        items: [{ kind: 'file', type: 'image/png' }],
        types: ['Files', 'text/plain'],
      },
    })

    expect(onChange).not.toHaveBeenCalled()
    expect(
      screen.getByText('不支持粘贴图片，请使用“上传图片”按钮'),
    ).toBeInTheDocument()

    fireEvent.paste(editor, {
      clipboardData: {
        files: [],
        getData: () => '普通文本',
        items: [],
        types: ['text/plain'],
      },
    })
    expect(onChange).toHaveBeenLastCalledWith('当前段落\n\n普通文本')
  })

  it('图片加载失败应显示错误占位和原始 URL', () => {
    render(
      <BlockMarkdownEditor
        value="![封面](https://example.com/broken.png)"
        onChange={vi.fn()}
      />,
    )

    fireEvent.error(screen.getByRole('img', { name: '封面' }))

    expect(screen.getByText('图片加载失败')).toBeInTheDocument()
    expect(
      screen.queryByText('https://example.com/broken.png'),
    ).not.toBeInTheDocument()
  })

  it('复制本地图片后移除其中一个块不应释放仍被历史和正文引用的草稿', () => {
    // Given 一个待保存图片块被复制为两个共享本地预览的块
    // When 管理员移除其中一个图片块
    // Then 剩余块继续显示且草稿保留给保存或撤销历史使用
    const previewUrl = 'blob:shared-draft'
    const draft: ImageDraft = {
      id: 'shared-draft',
      originalFile: new File(['source'], 'shared.webp', {
        type: 'image/webp',
      }),
      previewUrl,
      type: 'static',
      uploadBlob: new Blob(['cropped'], { type: 'image/webp' }),
    }
    const onDraftRelease = vi.fn()
    const { container } = render(
      <BlockMarkdownEditor
        imageDrafts={new Map([[previewUrl, draft]])}
        value={`![待保存图片](${previewUrl})`}
        onChange={vi.fn()}
        onImageDraftRelease={onDraftRelease}
      />,
    )
    const firstBlock = container.querySelector<HTMLElement>(
      '.block-editor__block',
    )!
    fireEvent.click(
      within(firstBlock).getByRole('button', { name: '打开块工具' }),
    )
    fireEvent.click(screen.getByRole('button', { name: '复制块' }))
    expect(screen.getAllByRole('img', { name: '待保存图片' })).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('img', { name: '待保存图片' })[0])
    fireEvent.click(screen.getByRole('button', { name: '移除图片' }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '移除正文图片' })).getByRole(
        'button',
        { name: '移除图片' },
      ),
    )

    expect(screen.getAllByRole('img', { name: '待保存图片' })).toHaveLength(1)
    expect(onDraftRelease).not.toHaveBeenCalled()
  })

  it('快捷键抽屉默认隐藏且点击后显示', () => {
    render(<BlockMarkdownEditor value="正文" onChange={vi.fn()} />)

    expect(
      screen.queryByRole('dialog', { name: '快捷键概览' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '打开快捷键概览' }))

    expect(
      screen.getByRole('dialog', { name: '快捷键概览' }),
    ).toBeInTheDocument()
    expect(screen.getByText('基础编辑')).toBeInTheDocument()
    expect(screen.getByText('Ctrl + S')).toBeInTheDocument()
  })

  it('编辑器聚焦时 Ctrl + S 应调用保存快捷键并阻止默认行为', () => {
    const onSaveShortcut = vi.fn()
    render(
      <BlockMarkdownEditor
        value="正文"
        onChange={vi.fn()}
        onSaveShortcut={onSaveShortcut}
      />,
    )
    const paragraph = screen.getByText('正文')
    paragraph.focus()

    const allowed = fireEvent.keyDown(paragraph, { key: 's', ctrlKey: true })

    expect(allowed).toBe(false)
    expect(onSaveShortcut).toHaveBeenCalledOnce()
  })

  it('退格键聚焦在块工具按钮时应保留原生行为，不删除文档块', () => {
    const onChange = vi.fn()
    render(<BlockMarkdownEditor value="" onChange={onChange} />)

    const toolbarButton = screen.getByRole('button', { name: '打开块工具' })
    toolbarButton.focus()

    const allowed = fireEvent.keyDown(toolbarButton, {
      key: 'Backspace',
      ctrlKey: true,
    })

    expect(allowed).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
    expect(
      document.querySelector(
        '[data-editor-input][data-placeholder="输入正文"]',
      ),
    ).toBeInTheDocument()
  })

  it('空编辑块中的 Ctrl + Backspace 应保留原生文字编辑行为', () => {
    const onChange = vi.fn()
    const { container } = render(
      <BlockMarkdownEditor value="" onChange={onChange} />,
    )
    const paragraph = container.querySelector<HTMLElement>(
      '[data-editor-input]',
    )!

    const allowed = fireEvent.keyDown(paragraph, {
      key: 'Backspace',
      ctrlKey: true,
    })

    expect(allowed).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('未配置保存回调时 Ctrl + S 应保留浏览器默认行为', () => {
    render(<BlockMarkdownEditor value="正文" onChange={vi.fn()} />)

    const allowed = fireEvent.keyDown(screen.getByText('正文'), {
      key: 's',
      ctrlKey: true,
    })

    expect(allowed).toBe(true)
  })
})
