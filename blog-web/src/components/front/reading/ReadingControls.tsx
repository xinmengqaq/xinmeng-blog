import { useState } from 'react'

import { FrontIcon } from '@/components/front/visual'
import { type ReadingPreferences } from '@/hooks/front/readingPreferences'

type SettingsProps = {
  preferences: ReadingPreferences
  update: (next: Partial<ReadingPreferences>) => void
  showTitle?: boolean
}

export const ReadingSettings = ({
  preferences,
  update,
  showTitle = false,
}: SettingsProps) => {
  const [hoveredControl, setHoveredControl] = useState<string | null>(null)
  const hoverHandlers = (control: string) => ({
    onPointerEnter: () => setHoveredControl(control),
    onPointerLeave: () =>
      setHoveredControl((current) => (current === control ? null : current)),
  })
  const controlClassName = (control: string, active = false) =>
    [active ? 'is-active' : '', hoveredControl === control ? 'is-hovered' : '']
      .filter(Boolean)
      .join(' ')

  return (
    <div className="reading-settings">
      {showTitle ? (
        <h3>
          <FrontIcon name="readingSettings" size={24} />
          阅读设置
        </h3>
      ) : null}
      <div className="reading-settings__group">
        <span className="reading-settings__label">字号</span>
        <div className="reading-settings__controls">
          <button
            type="button"
            className={controlClassName('font-decrease')}
            aria-label="减小字号"
            title="减小字号"
            disabled={preferences.fontSize <= 15}
            {...hoverHandlers('font-decrease')}
            onClick={() =>
              update({ fontSize: Math.max(15, preferences.fontSize - 1) })
            }
          >
            <FrontIcon name="decrease" size={16} />
          </button>
          <b>{preferences.fontSize}</b>
          <button
            type="button"
            className={controlClassName('font-increase')}
            aria-label="增大字号"
            title="增大字号"
            disabled={preferences.fontSize >= 21}
            {...hoverHandlers('font-increase')}
            onClick={() =>
              update({ fontSize: Math.min(21, preferences.fontSize + 1) })
            }
          >
            <FrontIcon name="increase" size={16} />
          </button>
        </div>
      </div>
      <div className="reading-settings__group">
        <span className="reading-settings__label">行高</span>
        <div className="reading-settings__controls">
          {[1.7, 1.9, 2.1].map((lineHeight) => (
            <button
              type="button"
              className={controlClassName(
                `line-height-${lineHeight}`,
                preferences.lineHeight === lineHeight,
              )}
              aria-pressed={preferences.lineHeight === lineHeight}
              key={lineHeight}
              {...hoverHandlers(`line-height-${lineHeight}`)}
              onClick={() => update({ lineHeight })}
            >
              {lineHeight === 1.7
                ? '紧凑'
                : lineHeight === 1.9
                  ? '标准'
                  : '舒展'}
            </button>
          ))}
        </div>
      </div>
      <div className="reading-settings__group">
        <span className="reading-settings__label">正文宽度</span>
        <div className="reading-settings__controls">
          {[660, 720, 800].map((contentWidth) => (
            <button
              type="button"
              className={controlClassName(
                `content-width-${contentWidth}`,
                preferences.contentWidth === contentWidth,
              )}
              aria-pressed={preferences.contentWidth === contentWidth}
              key={contentWidth}
              {...hoverHandlers(`content-width-${contentWidth}`)}
              onClick={() => update({ contentWidth })}
            >
              {contentWidth === 660
                ? '窄'
                : contentWidth === 720
                  ? '标准'
                  : '宽'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

type TocProps = SettingsProps & {
  headings: { id: string; level: 2 | 3; text: string }[]
  progress: number
  activeId: string
  onNavigate: (headingId: string) => void
  onBackTop: () => void
}

export const ReadingRail = ({
  headings,
  progress,
  activeId,
  onNavigate,
  preferences,
  update,
  onBackTop,
}: TocProps) => (
  <aside className="reading-rail">
    <h2>
      <FrontIcon name="tableOfContents" size={24} />
      文章目录
    </h2>
    <div className="reading-toc">
      {headings.length ? (
        headings.map((heading) => (
          <a
            className={`reading-toc__item reading-toc__item--${heading.level} ${activeId === heading.id ? 'is-active' : ''}`}
            key={heading.id}
            href={`#${heading.id}`}
            onClick={(event) => {
              event.preventDefault()
              onNavigate(heading.id)
            }}
          >
            {heading.text}
          </a>
        ))
      ) : (
        <p className="reading-toc__empty">本文暂无目录</p>
      )}
    </div>
    <div className="reading-progress">
      <div>
        <span>阅读进度</span>
        <strong>{Math.round(progress)}%</strong>
      </div>
      <span className="reading-progress__track">
        <i style={{ width: `${progress}%` }} />
      </span>
    </div>
    <ReadingSettings preferences={preferences} update={update} showTitle />
    <button className="reading-back-top" type="button" onClick={onBackTop}>
      <FrontIcon name="backToTop" size={24} />
      返回顶部
    </button>
  </aside>
)
