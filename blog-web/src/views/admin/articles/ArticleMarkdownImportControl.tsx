import { FileUp } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button, ConfirmDialog } from '@/components/ui'

import { readArticleMarkdownFile } from './articleMarkdownImport'

type ArticleMarkdownImportControlProps = {
  currentContent: string
  disabled?: boolean
  onImport: (content: string) => void
}

type PendingImport = {
  content: string
  fileName: string
}

type ImportFeedback = {
  type: 'error' | 'success'
  message: string
}

export const ArticleMarkdownImportControl = ({
  currentContent,
  disabled,
  onImport,
}: ArticleMarkdownImportControlProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [feedback, setFeedback] = useState<ImportFeedback | null>(null)

  const applyImport = (nextImport: PendingImport) => {
    onImport(nextImport.content)
    setPendingImport(null)
    setFeedback({ type: 'success', message: `已导入 ${nextImport.fileName}` })
  }

  const selectFile = async (file: File) => {
    setFeedback(null)
    try {
      const content = await readArticleMarkdownFile(file)
      const nextImport = { content, fileName: file.name }
      if (currentContent.trim()) {
        setPendingImport(nextImport)
      } else {
        applyImport(nextImport)
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error ? error.message : '无法导入 Markdown 文件',
      })
    }
  }

  return (
    <div className="article-markdown-import">
      <input
        ref={inputRef}
        accept=".md,text/markdown"
        aria-label="选择 Markdown 文件"
        className="article-markdown-import__input"
        disabled={disabled}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void selectFile(file)
        }}
      />
      <Button
        disabled={disabled}
        icon={<FileUp />}
        variant="secondary"
        onClick={() => inputRef.current?.click()}
      >
        导入 Markdown
      </Button>
      {feedback ? (
        <p
          className={`article-markdown-import__feedback article-markdown-import__feedback--${feedback.type}`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}
      <ConfirmDialog
        cancelText="保留当前正文"
        confirmText="确认导入"
        description={`将使用“${pendingImport?.fileName ?? ''}”的内容覆盖当前正文。`}
        open={Boolean(pendingImport)}
        title="覆盖当前正文"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) applyImport(pendingImport)
        }}
      />
    </div>
  )
}
