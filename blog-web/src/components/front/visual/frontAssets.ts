import primaryMark from '@/assets/front/brand/primary-mark.png'
import simplifiedMark from '@/assets/front/brand/simplified-mark.png'
import home from '@/assets/front/icons/ART-10-theme-semantic-icons-01-home-sakura-station-transparent.png'
import articles from '@/assets/front/icons/ART-10-theme-semantic-icons-02-articles-rail-ticket-booklet-transparent.png'
import category from '@/assets/front/icons/ART-10-theme-semantic-icons-03-category-track-switch-transparent.png'
import tag from '@/assets/front/icons/ART-10-theme-semantic-icons-04-tag-station-luggage-tag-transparent.png'
import date from '@/assets/front/icons/ART-10-theme-semantic-icons-06-date-sakura-station-clock-transparent.png'
import readingTime from '@/assets/front/icons/ART-10-theme-semantic-icons-07-reading-time-rail-clock-transparent.png'
import views from '@/assets/front/icons/ART-10-theme-semantic-icons-08-views-train-window-transparent.png'
import like from '@/assets/front/icons/ART-10-theme-semantic-icons-09-like-petal-heart-transparent.png'
import tableOfContents from '@/assets/front/icons/ART-10-theme-semantic-icons-10-table-of-contents-route-map-transparent.png'
import readingSettings from '@/assets/front/icons/ART-10-theme-semantic-icons-11-reading-settings-type-lines-transparent.png'
import backToTop from '@/assets/front/icons/ART-10-theme-semantic-icons-12-back-to-top-rail-arrow-transparent.png'
import search from '@/assets/front/icons/ART-11-basic-operation-icons-01-search-transparent.png'
import menu from '@/assets/front/icons/ART-11-basic-operation-icons-02-menu-transparent.png'
import close from '@/assets/front/icons/ART-11-basic-operation-icons-03-close-transparent.png'
import back from '@/assets/front/icons/ART-11-basic-operation-icons-04-back-transparent.png'
import forward from '@/assets/front/icons/ART-11-basic-operation-icons-05-forward-transparent.png'
import expand from '@/assets/front/icons/ART-11-basic-operation-icons-06-expand-transparent.png'
import collapse from '@/assets/front/icons/ART-11-basic-operation-icons-07-collapse-transparent.png'
import copy from '@/assets/front/icons/ART-11-basic-operation-icons-08-copy-transparent.png'
import retry from '@/assets/front/icons/ART-11-basic-operation-icons-09-retry-transparent.png'
import increase from '@/assets/front/icons/ART-11-basic-operation-icons-10-increase-transparent.png'
import decrease from '@/assets/front/icons/ART-11-basic-operation-icons-11-decrease-transparent.png'
import externalLink from '@/assets/front/icons/ART-11-basic-operation-icons-12-external-link-transparent.png'
import emptyTicket from '@/assets/front/states/empty-ticket.png'
import motionActive from '@/assets/front/states/motion-active.png'
import motionStopped from '@/assets/front/states/motion-stopped.png'
import pausedSignal from '@/assets/front/states/paused-signal.png'
import stationSeal from '@/assets/front/states/station-seal.png'
import singlePetal from '@/assets/front/atmosphere/single-petal.png'
import petalBloom from '@/assets/front/atmosphere/five-petal-bloom.png'
import pixelSakuraCursor from '@/assets/front/atmosphere/pixel-sakura-cursor.png'

export const frontIconAssets = {
  home,
  articles,
  category,
  tag,
  date,
  readingTime,
  views,
  like,
  tableOfContents,
  readingSettings,
  backToTop,
  search,
  menu,
  close,
  back,
  forward,
  expand,
  collapse,
  copy,
  retry,
  increase,
  decrease,
  externalLink,
} as const

export type FrontIconName = keyof typeof frontIconAssets

export const frontBrandAssets = { primaryMark, simplifiedMark } as const

export const frontIllustrationAssets = {
  emptyTicket,
  motionActive,
  motionStopped,
  pausedSignal,
  stationSeal,
  singlePetal,
  petalBloom,
  pixelSakuraCursor,
} as const

export type FrontIllustrationName = keyof typeof frontIllustrationAssets
