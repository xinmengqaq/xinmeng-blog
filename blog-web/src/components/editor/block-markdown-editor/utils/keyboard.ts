import type { BlockType } from '../types'

export type MarkdownBlockShortcut = {
  type: BlockType
  level?: 1 | 2 | 3
}

const markdownBlockShortcuts: Record<string, MarkdownBlockShortcut> = {
  '# ': { type: 'heading', level: 1 },
  '## ': { type: 'heading', level: 2 },
  '### ': { type: 'heading', level: 3 },
  '- ': { type: 'unordered-list' },
  '1. ': { type: 'ordered-list' },
  '- [ ] ': { type: 'task-list' },
  '> ': { type: 'quote' },
  '```': { type: 'code' },
  '---': { type: 'divider' },
}

export const getMarkdownBlockShortcut = (text: string) =>
  markdownBlockShortcuts[text]

export const getListKeyboardAction = (
  key: string,
  options: { shiftKey: boolean; isEmpty: boolean },
) => {
  if (key === 'Tab') {
    return options.shiftKey ? 'decrease-indent' : 'increase-indent'
  }
  if (key === 'Enter' && !options.shiftKey) return 'insert-item'
  if (key === 'Backspace' && options.isEmpty) return 'exit-list'
  return null
}
