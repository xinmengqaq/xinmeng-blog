import type { VirtualElement } from '@floating-ui/react-dom'

import { sanitizeEditorHtml } from '../markdown/sanitizeHtml'

export type EditorSelection = {
  range: Range
  editable: HTMLElement
  start: number
  end: number
}

const inlineFormatSelector = 'strong,b,em,i,u,s,del,code,a,span'
const wordCharacter = /[\p{L}\p{N}_-]/u
const isWordCharacter = (character: string | undefined) =>
  character !== undefined && wordCharacter.test(character)

const elementFromNode = (node: Node): HTMLElement | null =>
  node instanceof HTMLElement ? node : node.parentElement

const closestWithin = (node: Node, selector: string, boundary: HTMLElement) => {
  const element = elementFromNode(node)?.closest<HTMLElement>(selector)
  return element && boundary.contains(element) ? element : null
}

export const getEditorSelection = (
  editor: HTMLElement | null,
): EditorSelection | null => {
  const selection = window.getSelection()
  if (
    !editor ||
    !selection ||
    selection.rangeCount === 0 ||
    selection.isCollapsed
  ) {
    return null
  }
  const range = selection.getRangeAt(0)
  if (
    !editor.contains(range.startContainer) ||
    !editor.contains(range.endContainer)
  ) {
    return null
  }
  const startEditable = closestWithin(
    range.startContainer,
    '[data-editor-input]',
    editor,
  )
  const endEditable = closestWithin(
    range.endContainer,
    '[data-editor-input]',
    editor,
  )
  if (!startEditable || startEditable !== endEditable) {
    return null
  }
  const before = range.cloneRange()
  before.selectNodeContents(startEditable)
  before.setEnd(range.startContainer, range.startOffset)
  const start = before.toString().length
  return {
    range: range.cloneRange(),
    editable: startEditable,
    start,
    end: start + range.toString().length,
  }
}

export const splitEditorAtCaret = (editable: HTMLElement) => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null
  }
  const range = selection.getRangeAt(0)
  if (!editable.contains(range.startContainer)) return null
  const before = range.cloneRange()
  before.selectNodeContents(editable)
  before.setEnd(range.startContainer, range.startOffset)
  const after = range.cloneRange()
  after.selectNodeContents(editable)
  after.setStart(range.startContainer, range.startOffset)
  const toHtml = (fragment: DocumentFragment) => {
    const container = document.createElement('div')
    container.append(fragment)
    return container.innerHTML
  }
  return {
    beforeHtml: toHtml(before.cloneContents()),
    afterHtml: toHtml(after.cloneContents()),
  }
}

type CaretDocument = Document & {
  caretPositionFromPoint?: (
    x: number,
    y: number,
  ) => { offsetNode: Node; offset: number } | null
  caretRangeFromPoint?: (x: number, y: number) => Range | null
}

const getCaretRangeAtPoint = (x: number, y: number) => {
  const caretDocument = document as CaretDocument
  const range = caretDocument.caretRangeFromPoint?.(x, y)
  if (range) return range

  const position = caretDocument.caretPositionFromPoint?.(x, y)
  if (!position) return null
  const fallback = document.createRange()
  fallback.setStart(position.offsetNode, position.offset)
  fallback.collapse(true)
  return fallback
}

export const selectEditorWordAtPoint = (
  editor: HTMLElement | null,
  x: number,
  y: number,
) => {
  const caret = getCaretRangeAtPoint(x, y)
  if (!editor || !caret || caret.startContainer.nodeType !== Node.TEXT_NODE) {
    return null
  }

  const textNode = caret.startContainer as Text
  const editable = closestWithin(textNode, '[data-editor-input]', editor)
  if (!editable || !editable.contains(textNode)) return null

  const text = textNode.data
  if (!text) return null
  let offset = Math.min(caret.startOffset, text.length)
  if (!isWordCharacter(text[offset]) && offset > 0) offset -= 1
  if (!isWordCharacter(text[offset])) return null

  let start = offset
  let end = offset + 1
  while (start > 0 && isWordCharacter(text[start - 1])) start -= 1
  while (end < text.length && isWordCharacter(text[end])) end += 1

  const browserSelection = window.getSelection()
  if (!browserSelection) return null

  // Keep the browser selection anchored at the actual pointer location.
  const focus = offset - start <= end - offset ? end : start
  const range = document.createRange()
  range.setStart(textNode, Math.min(offset, focus))
  range.setEnd(textNode, Math.max(offset, focus))
  browserSelection.removeAllRanges()
  if (typeof browserSelection.setBaseAndExtent === 'function') {
    browserSelection.setBaseAndExtent(textNode, offset, textNode, focus)
  } else {
    browserSelection.addRange(range)
  }
  return getEditorSelection(editor)
}

const pointAtOffset = (editable: HTMLElement, offset: number) => {
  const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT)
  let remaining = offset
  let node = walker.nextNode()
  while (node) {
    const length = node.textContent?.length ?? 0
    if (remaining <= length) return { node, offset: remaining }
    remaining -= length
    node = walker.nextNode()
  }
  return { node: editable, offset: editable.childNodes.length }
}

export const resolveEditorSelection = (
  selection: EditorSelection,
): EditorSelection => {
  const start = pointAtOffset(selection.editable, selection.start)
  const end = pointAtOffset(selection.editable, selection.end)
  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)
  return { ...selection, range }
}

export const createRangeReference = (
  selection: EditorSelection,
): VirtualElement => ({
  contextElement: selection.editable,
  getBoundingClientRect: () => {
    const current = resolveEditorSelection(selection).range
    return typeof current.getBoundingClientRect === 'function'
      ? current.getBoundingClientRect()
      : selection.editable.getBoundingClientRect()
  },
})

const wrapRange = (range: Range, wrapper: HTMLElement) => {
  const fragment = range.extractContents()
  wrapper.append(fragment)
  range.insertNode(wrapper)
  range.selectNodeContents(wrapper)
}

const unwrap = (element: HTMLElement) => {
  const parent = element.parentNode
  if (!parent) return
  while (element.firstChild) parent.insertBefore(element.firstChild, element)
  element.remove()
}

export const toggleInlineTag = (
  selection: EditorSelection,
  tagName: 'strong' | 'em' | 'u' | 'del' | 'code',
) => {
  const aliases: Record<typeof tagName, string> = {
    strong: 'strong,b',
    em: 'em,i',
    u: 'u',
    del: 'del,s',
    code: 'code',
  }
  const existing = closestWithin(
    selection.range.startContainer,
    aliases[tagName],
    selection.editable,
  )
  if (existing && existing.contains(selection.range.endContainer)) {
    unwrap(existing)
  } else {
    wrapRange(selection.range, document.createElement(tagName))
  }
}

export const normalizeEditorLink = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  try {
    const protocol = new URL(candidate, window.location.origin).protocol
    return ['http:', 'https:', 'mailto:'].includes(protocol) ? candidate : null
  } catch {
    return null
  }
}

export const setSelectionLink = (selection: EditorSelection, href: string) => {
  const link = document.createElement('a')
  link.setAttribute('href', href)
  wrapRange(selection.range, link)
}

export const removeSelectionLink = (selection: EditorSelection) => {
  const link = closestWithin(
    selection.range.startContainer,
    'a',
    selection.editable,
  )
  if (link && link.contains(selection.range.endContainer)) unwrap(link)
}

const createSanitizedSpan = (
  property: 'color' | 'background-color',
  value: string,
) => {
  const clean = sanitizeEditorHtml(`<span style="${property}:${value}"></span>`)
  const document = new DOMParser().parseFromString(clean, 'text/html')
  return document.body.firstElementChild as HTMLSpanElement | null
}

export const setSelectionStyle = (
  selection: EditorSelection,
  property: 'color' | 'background-color',
  value: string,
) => {
  const span = createSanitizedSpan(property, value)
  if (span) wrapRange(selection.range, span)
}

export const clearSelectionFormatting = (selection: EditorSelection) => {
  const ancestors: HTMLElement[] = []
  let current = elementFromNode(selection.range.startContainer)
  while (current && current !== selection.editable) {
    if (
      current.matches(inlineFormatSelector) &&
      current.contains(selection.range.endContainer)
    ) {
      ancestors.push(current)
    }
    current = current.parentElement
  }
  ancestors.forEach(unwrap)

  const fragment = selection.range.extractContents()
  Array.from(fragment.querySelectorAll<HTMLElement>(inlineFormatSelector))
    .reverse()
    .forEach(unwrap)
  const nodes = Array.from(fragment.childNodes)
  selection.range.insertNode(fragment)
  if (nodes.length > 0) {
    selection.range.setStartBefore(nodes[0])
    selection.range.setEndAfter(nodes[nodes.length - 1])
  }
  selection.editable
    .querySelectorAll<HTMLElement>(inlineFormatSelector)
    .forEach((element) => {
      if (!element.textContent) element.remove()
    })
}

export const commitEditorSelection = (selection: EditorSelection) => {
  selection.editable.dispatchEvent(new Event('input', { bubbles: true }))
  selection.editable.focus()
  const browserSelection = window.getSelection()
  browserSelection?.removeAllRanges()
  selection.range.collapse(false)
  browserSelection?.addRange(selection.range)
}
