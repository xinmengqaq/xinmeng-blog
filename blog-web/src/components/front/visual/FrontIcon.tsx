import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  GitBranch,
  Heart,
  Home,
  List,
  Menu,
  Minus,
  Plus,
  RotateCw,
  Search,
  Settings2,
  Tag,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'

import {
  frontIconAssets,
  type FrontIconName,
} from '@/components/front/visual/frontAssets'

const fallbackIcons: Record<FrontIconName, LucideIcon> = {
  home: Home,
  articles: BookOpen,
  category: GitBranch,
  tag: Tag,
  date: CalendarDays,
  readingTime: Clock3,
  views: Eye,
  like: Heart,
  tableOfContents: List,
  readingSettings: Settings2,
  backToTop: ArrowUp,
  search: Search,
  menu: Menu,
  close: X,
  back: ArrowLeft,
  forward: ArrowRight,
  expand: ChevronDown,
  collapse: ChevronUp,
  copy: Copy,
  retry: RotateCw,
  increase: Plus,
  decrease: Minus,
  externalLink: ExternalLink,
}

type Props = {
  name: FrontIconName
  size?: 16 | 24 | 32
  state?: 'default' | 'active' | 'success' | 'disabled'
  decorative?: boolean
  label?: string
  className?: string
}

export const FrontIcon = ({
  name,
  size = 24,
  state = 'default',
  decorative = true,
  label,
  className = '',
}: Props) => {
  const [failed, setFailed] = useState(false)
  const FallbackIcon = fallbackIcons[name]

  useEffect(() => setFailed(false), [name])

  return (
    <span
      className={`front-icon front-icon--${size} front-icon--${state} ${className}`.trim()}
      style={{ '--front-icon-size': `${size}px` } as CSSProperties}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : 'img'}
    >
      {failed ? (
        <FallbackIcon aria-hidden="true" />
      ) : (
        <img
          alt=""
          src={frontIconAssets[name]}
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
