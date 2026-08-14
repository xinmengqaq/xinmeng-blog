import {
  useCallback,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react'

export type BlockSelectionRect = {
  left: number
  top: number
  width: number
  height: number
}

type DragState = {
  startX: number
  startY: number
  active: boolean
}

const DRAG_THRESHOLD = 4

const getRect = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) => {
  const left = Math.min(startX, endX)
  const top = Math.min(startY, endY)
  return {
    left,
    top,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  }
}

const intersects = (block: DOMRect, selection: BlockSelectionRect) => {
  const right = selection.left + selection.width
  const bottom = selection.top + selection.height
  const horizontal =
    Math.max(selection.left, block.left) <= Math.min(right, block.right)
  const vertical =
    Math.max(selection.top, block.top) <= Math.min(bottom, block.bottom)
  return horizontal && vertical
}

const isSelectionStart = (target: HTMLElement) =>
  Boolean(
    target.closest('.block-editor__document') &&
    !target.closest(
      '[data-editor-input],button,input,textarea,select,[role="toolbar"],.block-editor__shortcut-drawer',
    ),
  )

export const useBlockSelectionDrag = (enabled: boolean) => {
  const dragRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const [selectionRect, setSelectionRect] = useState<BlockSelectionRect | null>(
    null,
  )

  const updateSelection = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const selection = getRect(
      drag.startX,
      drag.startY,
      event.clientX,
      event.clientY,
    )
    if (
      !drag.active &&
      selection.width < DRAG_THRESHOLD &&
      selection.height < DRAG_THRESHOLD
    ) {
      return
    }
    drag.active = true
    event.preventDefault()
    setSelectionRect(selection)
    const selectedIds = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[data-block-id]'),
    )
      .filter((block) => intersects(block.getBoundingClientRect(), selection))
      .map((block) => block.dataset.blockId)
      .filter((blockId): blockId is string => Boolean(blockId))
    return selectedIds
  }, [])

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) return false
      const target = event.target as HTMLElement
      if (!isSelectionStart(target)) return false
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        active: false,
      }
      setSelectionRect(null)
      event.currentTarget.setPointerCapture?.(event.pointerId)
      return true
    },
    [enabled],
  )

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag) return null
      const selectedIds = drag.active ? updateSelection(event) : null
      suppressClickRef.current = drag.active
      dragRef.current = null
      setSelectionRect(null)
      event.currentTarget.releasePointerCapture?.(event.pointerId)
      return selectedIds
    },
    [updateSelection],
  )

  const onPointerCancel = useCallback(() => {
    dragRef.current = null
    suppressClickRef.current = false
    setSelectionRect(null)
  }, [])

  const onClickCapture = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return
    suppressClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }, [])

  return {
    selectionRect,
    selecting: Boolean(selectionRect),
    onPointerDown,
    onPointerMove: updateSelection,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
  }
}
