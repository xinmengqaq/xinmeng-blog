import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  type BlockerFunction,
  useBeforeUnload,
  useBlocker,
} from 'react-router-dom'

import type { ImageDraft, SiteBackgroundChange } from '@/types/file'
import { releaseImageDraft } from '@/utils/imageDrafts'

const BACKGROUND_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const BACKGROUND_FILE_EXTENSION = /\.(jpe?g|png|webp)$/i

const getBackgroundFileError = (file: File): string | null => {
  if (file.size === 0) {
    return '背景文件不能为空，请重新选择图片'
  }

  if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) {
    return '站点背景不支持 GIF，请选择 JPG、PNG 或 WebP 图片'
  }

  const hasAcceptedMimeType = BACKGROUND_FILE_TYPES.has(file.type)
  const hasAcceptedExtension = BACKGROUND_FILE_EXTENSION.test(file.name)

  if (
    (file.type && !hasAcceptedMimeType) ||
    (!file.type && !hasAcceptedExtension)
  ) {
    return '请选择 JPG、JPEG、PNG 或 WebP 格式的图片'
  }

  return null
}

const useSiteBackgroundChange = () => {
  const [change, setChangeState] = useState<SiteBackgroundChange | null>(null)
  const changeRef = useRef<SiteBackgroundChange | null>(null)

  useEffect(
    () => () => {
      const pendingChange = changeRef.current

      if (pendingChange?.kind === 'upload') {
        releaseImageDraft(pendingChange.draft)
      }
    },
    [],
  )

  const setChange = useCallback((nextChange: SiteBackgroundChange | null) => {
    const currentChange = changeRef.current

    if (
      currentChange?.kind === 'upload' &&
      (nextChange?.kind !== 'upload' ||
        currentChange.draft !== nextChange.draft)
    ) {
      releaseImageDraft(currentChange.draft)
    }

    changeRef.current = nextChange
    setChangeState(nextChange)
  }, [])

  return { change, setChange }
}

const useUnsavedBackgroundLeaveGuard = (
  hasPendingChanges: boolean,
  discardChanges: () => void,
) => {
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      hasPendingChanges && currentLocation.pathname !== nextLocation.pathname,
    [hasPendingChanges],
  )
  const blocker = useBlocker(shouldBlock)

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!hasPendingChanges) {
          return
        }

        event.preventDefault()
        event.returnValue = ''
      },
      [hasPendingChanges],
    ),
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setLeaveDialogOpen(true)
    }
  }, [blocker.state])

  const cancelLeave = () => {
    setLeaveDialogOpen(false)

    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }

  const confirmLeave = () => {
    discardChanges()
    setLeaveDialogOpen(false)

    if (blocker.state === 'blocked') {
      blocker.proceed()
    }
  }

  return { leaveDialogOpen, cancelLeave, confirmLeave }
}

export const useSiteBackgroundDraft = () => {
  const { change, setChange } = useSiteBackgroundChange()
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const hasPendingChanges = Boolean(change)

  const discardChanges = useCallback(() => {
    setChange(null)
    setFileError(null)
  }, [setChange])
  const leaveGuard = useUnsavedBackgroundLeaveGuard(
    hasPendingChanges,
    discardChanges,
  )

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const error = getBackgroundFileError(file)

    if (error) {
      setFileError(error)
      return
    }

    setFileError(null)
    setCropFile(file)
  }

  const applyCrop = (draft: ImageDraft) => {
    setChange({ kind: 'upload', draft })
    setFileError(null)
  }

  const confirmRemove = () => {
    setChange({ kind: 'remove' })
    setFileError(null)
    setRemoveDialogOpen(false)
  }

  return {
    change,
    cropFile,
    fileError,
    hasPendingChanges,
    leaveDialogOpen: leaveGuard.leaveDialogOpen,
    removeDialogOpen,
    applyCrop,
    cancelLeave: leaveGuard.cancelLeave,
    closeCropDialog: () => setCropFile(null),
    closeRemoveDialog: () => setRemoveDialogOpen(false),
    confirmLeave: leaveGuard.confirmLeave,
    confirmRemove,
    discardChanges,
    handleFileChange,
    openRemoveDialog: () => setRemoveDialogOpen(true),
  }
}

export type SiteBackgroundDraft = ReturnType<typeof useSiteBackgroundDraft>
