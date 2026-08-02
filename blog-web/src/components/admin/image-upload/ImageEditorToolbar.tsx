import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui'

import './imageEditorToolbar.css'

type ImageEditorState = 'current' | 'empty' | 'upload' | 'remove' | 'saving'

type ImageEditorToolbarProps = {
  children: ReactNode
  disabled?: boolean
  onUndo?: () => void
  state: ImageEditorState
  status: string
  undoLabel?: string
  undoTitle?: string
}

export const ImageEditorToolbar = ({
  children,
  disabled = false,
  onUndo,
  state,
  status,
  undoLabel = '撤销变更',
  undoTitle = '撤销变更',
}: ImageEditorToolbarProps) => (
  <div className="image-editor-toolbar">
    <div className="image-editor-toolbar__context">
      <span
        className="image-editor-toolbar__status"
        data-state={state}
        role="status"
      >
        {status}
      </span>
      {onUndo ? (
        <Button
          aria-label={undoLabel}
          className="image-editor-toolbar__icon-action"
          disabled={disabled}
          icon={<RotateCcw />}
          onClick={onUndo}
          size="sm"
          title={undoTitle}
          variant="ghost"
        />
      ) : null}
    </div>
    <div className="image-editor-toolbar__actions">{children}</div>
  </div>
)
