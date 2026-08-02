import { useState } from 'react'

import { storage } from '@/utils/storage'

export const READING_PREFERENCES_KEY = 'front-reading-preferences'
export type ReadingPreferences = {
  fontSize: number
  lineHeight: number
  contentWidth: number
}
export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  fontSize: 17,
  lineHeight: 1.9,
  contentWidth: 720,
}

export const normalizeReadingPreferences = (
  value?: Partial<ReadingPreferences> | null,
): ReadingPreferences => ({
  fontSize:
    value?.fontSize && value.fontSize >= 15 && value.fontSize <= 21
      ? value.fontSize
      : DEFAULT_READING_PREFERENCES.fontSize,
  lineHeight:
    value?.lineHeight && value.lineHeight >= 1.6 && value.lineHeight <= 2.2
      ? value.lineHeight
      : DEFAULT_READING_PREFERENCES.lineHeight,
  contentWidth:
    value?.contentWidth &&
    value.contentWidth >= 640 &&
    value.contentWidth <= 800
      ? value.contentWidth
      : DEFAULT_READING_PREFERENCES.contentWidth,
})

export const readReadingPreferences = () =>
  normalizeReadingPreferences(
    storage.get<ReadingPreferences>(READING_PREFERENCES_KEY),
  )

export const readingPreferenceStyles = (value: ReadingPreferences) =>
  ({
    '--reading-font-size': `${value.fontSize}px`,
    '--reading-line-height': String(value.lineHeight),
    '--reading-content-width': `${value.contentWidth}px`,
  }) as React.CSSProperties

export const useReadingPreferences = () => {
  const [preferences, setPreferences] = useState(readReadingPreferences)
  const update = (next: Partial<ReadingPreferences>) => {
    const value = normalizeReadingPreferences({ ...preferences, ...next })
    setPreferences(value)
    storage.set(READING_PREFERENCES_KEY, value)
  }
  return { preferences, update }
}
