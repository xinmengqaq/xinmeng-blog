import { useEffect, useRef, useState } from 'react'

import { FrontAssetImage, FrontIcon } from '@/components/front/visual'
import { copyText } from '@/utils/clipboard'
import { highlightCode, normalizeCodeLanguage } from '@/utils/syntaxHighlight'

export const CodeBlock = ({
  code,
  language,
}: {
  code: string
  language?: string | null
}) => {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current != null) window.clearTimeout(resetTimer.current)
    },
    [],
  )

  const copy = async () => {
    try {
      await copyText(code)
      setCopied(true)
      if (resetTimer.current != null) window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  const normalizedLanguage = normalizeCodeLanguage(language)

  return (
    <div className="reading-code">
      <pre>
        <code
          className={
            normalizedLanguage ? `language-${normalizedLanguage}` : undefined
          }
          dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
        />
      </pre>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? '已复制' : '复制代码'}
        title={copied ? '已复制' : '复制代码'}
      >
        {copied ? (
          <FrontAssetImage
            className="reading-code__success-icon"
            name="stationSeal"
            fallback={<FrontIcon name="copy" size={16} state="success" />}
          />
        ) : (
          <FrontIcon name="copy" size={16} />
        )}
      </button>
    </div>
  )
}
