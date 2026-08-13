import { useId, useRef, useState } from 'react'

import { Alert, Button, FormField, Input, Modal, Switch } from '@/components/ui'
import type {
  AdminMusic,
  CreateAdminMusicParams,
  UpdateAdminMusicData,
} from '@/types/music'

import './adminMusic.css'

type MusicFormDialogProps = {
  open: boolean
  music?: AdminMusic | null
  loading: boolean
  requestError?: string | null
  onClose: () => void
  onCreate: (params: CreateAdminMusicParams) => Promise<void>
  onUpdate: (id: number, data: UpdateAdminMusicData) => Promise<void>
}

export const MusicFormDialog = ({
  open,
  music,
  loading,
  requestError,
  onClose,
  onCreate,
  onUpdate,
}: MusicFormDialogProps) => {
  const titleId = useId()
  const artistId = useId()
  const fileId = useId()
  const [title, setTitle] = useState(music?.title ?? '')
  const [artist, setArtist] = useState(music?.artist ?? '')
  const [enabled, setEnabled] = useState(music?.is_enabled ?? true)
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submittingRef = useRef(false)

  const submit = async () => {
    if (submittingRef.current) return
    const normalizedTitle = title.trim()
    const normalizedArtist = artist.trim()
    const nextErrors: Record<string, string> = {}
    if (!normalizedTitle) nextErrors.title = '歌曲名不能为空'
    else if (normalizedTitle.length > 120)
      nextErrors.title = '歌曲名最多 120 个字符'
    if (normalizedArtist.length > 120) nextErrors.artist = '歌手最多 120 个字符'
    if (!music && !file) nextErrors.file = '请选择 MP3 文件'
    if (file && !file.name.toLowerCase().endsWith('.mp3'))
      nextErrors.file = '请选择 MP3 文件'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    if (!music) {
      submittingRef.current = true
      try {
        await onCreate({
          title: normalizedTitle,
          ...(normalizedArtist ? { artist: normalizedArtist } : {}),
          file: file!,
        })
      } finally {
        submittingRef.current = false
      }
      return
    }

    const data: UpdateAdminMusicData = {}
    if (normalizedTitle !== music.title) data.title = normalizedTitle
    if (normalizedArtist !== (music.artist ?? ''))
      data.artist = normalizedArtist || null
    if (enabled !== music.is_enabled) data.is_enabled = enabled
    if (!Object.keys(data).length) {
      onClose()
      return
    }
    submittingRef.current = true
    try {
      await onUpdate(music.id, data)
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <Modal
      locked={loading}
      open={open}
      panelClassName="music-form-modal"
      title={music ? '编辑音乐' : '上传音乐'}
      onClose={onClose}
      footer={
        <>
          <Button disabled={loading} onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button loading={loading} onClick={() => void submit()}>
            {music ? '保存修改' : '上传音乐'}
          </Button>
        </>
      }
    >
      <div className="music-form">
        {requestError ? <Alert type="error">{requestError}</Alert> : null}
        <FormField
          error={errors.title}
          htmlFor={titleId}
          label="歌曲名"
          required
        >
          <Input
            data-modal-initial-focus
            error={Boolean(errors.title)}
            id={titleId}
            maxLength={121}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setErrors((current) => ({ ...current, title: '' }))
            }}
          />
        </FormField>
        <FormField error={errors.artist} htmlFor={artistId} label="歌手">
          <Input
            error={Boolean(errors.artist)}
            id={artistId}
            maxLength={121}
            value={artist}
            onChange={(event) => {
              setArtist(event.target.value)
              setErrors((current) => ({ ...current, artist: '' }))
            }}
          />
        </FormField>
        {music ? (
          <Switch
            checked={enabled}
            disabled={loading}
            label={enabled ? '已启用' : '已停用'}
            onChange={setEnabled}
          />
        ) : (
          <FormField
            error={errors.file}
            htmlFor={fileId}
            label="音乐文件"
            required
          >
            <label className="music-file-picker" htmlFor={fileId}>
              <span>{file ? file.name : '选择 MP3 文件'}</span>
              <strong>浏览</strong>
            </label>
            <input
              accept=".mp3,audio/mpeg"
              className="music-file-picker__input"
              id={fileId}
              type="file"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null)
                setErrors((current) => ({ ...current, file: '' }))
              }}
            />
          </FormField>
        )}
      </div>
    </Modal>
  )
}
