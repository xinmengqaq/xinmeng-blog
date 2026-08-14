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
  width: number
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
  const widthValue = image
    .getAttribute('style')
    ?.match(/(?:^|;)\s*width\s*:\s*(100|[1-9]?\d)%\s*(?:;|$)/i)?.[1]
  const width = Number(widthValue)
  return {
    url: image.getAttribute('src') ?? '',
    alt: image.getAttribute('alt') ?? '',
    align,
    width: Number.isInteger(width) && width >= 1 && width <= 100 ? width : 100,
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
  width = 100,
}: AlignedImageHtml) =>
  DOMPurify.sanitize(
    `<p style="text-align:${align}"><img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}"${width !== 100 ? ` style="width:${width}%"` : ''}></p>`,
    imageHtmlConfig,
  )
