import { useCallback, useEffect, useRef, useState } from 'react'

import type { ArticleCoverChange, ImageDraft } from '@/types/file'
import { releaseImageDraft } from '@/utils/imageDrafts'

export const useArticleImageDrafts = () => {
  const [coverChange, setCoverChangeState] =
    useState<ArticleCoverChange | null>(null)
  const [contentDrafts, setContentDrafts] = useState(
    () => new Map<string, ImageDraft>(),
  )
  const coverRef = useRef<ArticleCoverChange | null>(null)
  const contentRef = useRef(new Map<string, ImageDraft>())

  const setCoverChange = useCallback((next: ArticleCoverChange | null) => {
    const current = coverRef.current
    if (
      current?.kind === 'upload' &&
      (next?.kind !== 'upload' || next.draft !== current.draft)
    ) {
      releaseImageDraft(current.draft)
    }
    coverRef.current = next
    setCoverChangeState(next)
  }, [])

  const registerContentDraft = useCallback((draft: ImageDraft) => {
    const next = new Map(contentRef.current)
    next.set(draft.previewUrl, draft)
    contentRef.current = next
    setContentDrafts(next)
  }, [])

  const releaseContentDraft = useCallback((previewUrl: string) => {
    const draft = contentRef.current.get(previewUrl)
    if (!draft) return
    releaseImageDraft(draft)
    const next = new Map(contentRef.current)
    next.delete(previewUrl)
    contentRef.current = next
    setContentDrafts(next)
  }, [])

  const discardAll = useCallback(() => {
    const cover = coverRef.current
    if (cover?.kind === 'upload') releaseImageDraft(cover.draft)
    contentRef.current.forEach(releaseImageDraft)
    coverRef.current = null
    contentRef.current = new Map()
    setCoverChangeState(null)
    setContentDrafts(new Map())
  }, [])

  useEffect(() => discardAll, [discardAll])

  return {
    coverChange,
    contentDrafts,
    discardAll,
    registerContentDraft,
    releaseContentDraft,
    setCoverChange,
  }
}
