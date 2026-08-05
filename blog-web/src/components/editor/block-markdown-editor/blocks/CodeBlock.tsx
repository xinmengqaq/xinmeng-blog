import { ChevronDown, ChevronUp } from 'lucide-react'
import { useId, useState } from 'react'
import EditorModule from 'react-simple-code-editor'

import { highlightCode } from '@/utils/syntaxHighlight'

import type { CodeBlock as CodeBlockType } from '../types'

type CodeBlockProps = {
  block: CodeBlockType
  readOnly: boolean
  onChange: (block: CodeBlockType) => void
}

const CODE_PREVIEW_HEIGHT = 176
const Editor =
  (EditorModule as unknown as { default?: typeof EditorModule }).default ??
  EditorModule

export const CodeBlock = ({ block, readOnly, onChange }: CodeBlockProps) => {
  const textareaId = useId()
  const [expanded, setExpanded] = useState(false)
  const lineCount = block.code.split('\n').length
  const expandable = lineCount > 7 || block.code.length > 280

  return (
    <div className="block-editor__code">
      <div className="block-editor__code-header">
        <input
          aria-label="代码语言"
          className="block-editor__code-language"
          disabled={readOnly}
          placeholder="语言"
          value={block.language ?? ''}
          onChange={(event) =>
            onChange({ ...block, language: event.target.value || undefined })
          }
        />
        {expandable ? (
          <button
            aria-expanded={expanded}
            aria-label={expanded ? '收起代码块' : '展开代码块'}
            className="block-editor__code-expand"
            title={expanded ? '收起代码块' : '展开代码块'}
            type="button"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? (
              <ChevronUp aria-hidden="true" />
            ) : (
              <ChevronDown aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
      <label className="admin-visually-hidden" htmlFor={textareaId}>
        代码内容
      </label>
      <div
        className="block-editor__code-viewport"
        style={
          expandable && !expanded
            ? { maxHeight: `${CODE_PREVIEW_HEIGHT}px` }
            : undefined
        }
      >
        <Editor
          className="block-editor__code-input"
          disabled={readOnly}
          highlight={(code) => highlightCode(code, block.language)}
          insertSpaces
          padding={16}
          preClassName="block-editor__code-highlight"
          tabSize={2}
          textareaClassName="block-editor__code-textarea"
          textareaId={textareaId}
          value={block.code}
          onKeyDown={(event) => {
            const key = event.key.toLowerCase()
            if (
              (event.ctrlKey || event.metaKey) &&
              !event.altKey &&
              (key === 'z' || key === 'y')
            ) {
              event.stopPropagation()
            }
          }}
          onValueChange={(code) => onChange({ ...block, code })}
        />
      </div>
    </div>
  )
}
