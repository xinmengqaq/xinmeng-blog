import type { CodeBlock as CodeBlockType } from '../types'

type CodeBlockProps = {
  block: CodeBlockType
  readOnly: boolean
  onChange: (block: CodeBlockType) => void
}

export const CodeBlock = ({ block, readOnly, onChange }: CodeBlockProps) => (
  <div className="block-editor__code">
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
    <textarea
      aria-label="代码内容"
      disabled={readOnly}
      spellCheck={false}
      value={block.code}
      onChange={(event) => onChange({ ...block, code: event.target.value })}
    />
  </div>
)
