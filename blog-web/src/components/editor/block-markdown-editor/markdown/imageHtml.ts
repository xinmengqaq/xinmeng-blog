import DOMPurify from 'dompurify'

import type { TextAlign } from '../types'

const alignments = new Set<TextAlign>(['left', 'center', 'right'])
const imageHtmlConfig = {
  ALLOWED_TAGS: ['p', 'img'],
  ALLOWED_ATTR: ['style', 'src', 'alt'],
}

export type AlignedImageHtml = {
  url: string
  alt: string
  align: TextAlign
}

export const parseAlignedImageHtml = (
  html: string,
): AlignedImageHtml | null => {
  const clean = DOMPurify.sanitize(html, imageHtmlConfig)
  const document = new DOMParser().parseFromString(clean, 'text/html')
  const paragraph = document.body.firstElementChild
  if (
    document.body.children.length !== 1 ||
    paragraph?.tagName !== 'P' ||
    paragraph.children.length !== 1
  ) {
    return null
  }
  const image = paragraph.firstElementChild
  if (image?.tagName !== 'IMG') return null
  const alignment = paragraph
    .getAttribute('style')
    ?.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right)\s*(?:;|$)/i)?.[1]
  const align = alignment?.toLowerCase() as TextAlign | undefined
  if (!align || !alignments.has(align)) return null
  return {
    url: image.getAttribute('src') ?? '',
    alt: image.getAttribute('alt') ?? '',
    align,
  }
}

const escapeAttribute = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

export const serializeAlignedImageHtml = ({
  url,
  alt,
  align,
}: AlignedImageHtml) =>
  DOMPurify.sanitize(
    `<p style="text-align:${align}"><img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}"></p>`,
    imageHtmlConfig,
  )
