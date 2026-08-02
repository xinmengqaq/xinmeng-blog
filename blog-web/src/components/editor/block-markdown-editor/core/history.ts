import type { EditorBlock } from '../types'

export type EditorHistory = {
  past: EditorBlock[][]
  present: EditorBlock[]
  future: EditorBlock[][]
}

export const createHistory = (blocks: EditorBlock[]): EditorHistory => ({
  past: [],
  present: blocks,
  future: [],
})

export const pushHistory = (
  history: EditorHistory,
  blocks: EditorBlock[],
): EditorHistory => ({
  past: [...history.past, history.present],
  present: blocks,
  future: [],
})

export const undoHistory = (history: EditorHistory): EditorHistory => {
  const previous = history.past.at(-1)
  if (!previous) {
    return history
  }
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export const redoHistory = (history: EditorHistory): EditorHistory => {
  const next = history.future[0]
  if (!next) {
    return history
  }
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}
