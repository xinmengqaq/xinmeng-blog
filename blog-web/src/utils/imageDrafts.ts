import type { ImageDraft } from '../types/file'

const activeObjectUrls = new Set<string>()

export function createImageDraft(
  originalFile: File,
  uploadBlob: Blob = originalFile,
  alt?: string,
): ImageDraft {
  const previewUrl = URL.createObjectURL(uploadBlob)
  activeObjectUrls.add(previewUrl)

  return {
    id: crypto.randomUUID(),
    originalFile,
    uploadBlob,
    previewUrl,
    type: originalFile.type === 'image/gif' ? 'gif' : 'static',
    alt,
  }
}

export function getImageDraftUrl(draft: ImageDraft): string {
  return draft.previewUrl
}

export function releaseImageDraft(draft: ImageDraft): void {
  if (activeObjectUrls.delete(draft.previewUrl)) {
    URL.revokeObjectURL(draft.previewUrl)
  }
}

export function releaseAllImageDrafts(drafts: ImageDraft[]): void {
  drafts.forEach(releaseImageDraft)
}

export function getDraftType(draft: ImageDraft): 'static' | 'gif' {
  return draft.type
}
