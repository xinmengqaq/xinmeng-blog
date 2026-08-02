import DOMPurify from 'dompurify'

export const allowedTextColors = [
  '#111827',
  '#6b7280',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#0891b2',
] as const

export const allowedBackgroundColors = [
  '#ffffff',
  '#e5e7eb',
  '#fecdd3',
  '#fed7aa',
  '#fef3c7',
  '#bbf7d0',
  '#bfdbfe',
  '#ddd6fe',
  '#fbcfe8',
  '#a5f3fc',
] as const

export const allowedHtmlTags = [
  'span',
  'u',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'colgroup',
  'col',
] as const

const textColors = new Set<string>(allowedTextColors)
const backgroundColors = new Set<string>(allowedBackgroundColors)
const safeAlignments = new Set(['left', 'center', 'right'])
const safeWidth = /^(?:[1-9]\d{0,3}px|(?:100|[1-9]?\d)%)$/

const sanitizeStyle = (style: string) =>
  style
    .split(';')
    .map((declaration) =>
      declaration.split(':', 2).map((value) => value.trim()),
    )
    .filter(([name, value]) => {
      const property = name.toLowerCase()
      const normalized = value?.toLowerCase()
      if (!normalized) return false
      if (property === 'color') return textColors.has(normalized)
      if (property === 'background-color') {
        return backgroundColors.has(normalized)
      }
      if (property === 'text-align') return safeAlignments.has(normalized)
      return property === 'width' && safeWidth.test(normalized)
    })
    .map(([name, value]) => `${name.toLowerCase()}:${value.toLowerCase()}`)
    .join(';')

export const sanitizeAuthorHtml = (html: string) => {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...allowedHtmlTags],
    ALLOWED_ATTR: ['style', 'rowspan', 'colspan'],
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'object',
      'embed',
      'video',
      'audio',
    ],
  })
  const document = new DOMParser().parseFromString(clean, 'text/html')

  document.body.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    const style = sanitizeStyle(element.getAttribute('style') ?? '')
    if (style) element.setAttribute('style', style)
    else element.removeAttribute('style')
  })

  document.body
    .querySelectorAll<HTMLElement>('[rowspan], [colspan]')
    .forEach((element) => {
      for (const attribute of ['rowspan', 'colspan']) {
        const value = Number(element.getAttribute(attribute))
        if (!Number.isInteger(value) || value < 1 || value > 100) {
          element.removeAttribute(attribute)
        }
      }
    })

  return document.body.innerHTML
}
