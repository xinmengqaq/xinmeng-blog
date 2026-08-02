import { useEffect, useRef, useState } from 'react'

import { FrontAssetImage, FrontIcon } from '@/components/front/visual'
import { copyText } from '@/utils/clipboard'

export const CodeBlock = ({ code }: { code: string }) => {
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
  return (
    <div className="reading-code">
      <pre>
        <code>{code}</code>
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
