import { Check, LockKeyhole, Trash2, Upload, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'

import { FrontAccountModal } from '@/components/front/account'
import { FrontArticleImage } from '@/components/front/article'
import { ImageCropDialog } from '@/components/image-editor'
import { Button, FormField, Input, Toast } from '@/components/ui'
import { useSaveUserProfileMutation } from '@/queries/userProfile'
import type { CurrentUserProfile } from '@/types/userAuth'
import type { ImageDraft, UserAvatarChange } from '@/types/file'
import { releaseImageDraft } from '@/utils/imageDrafts'
import { toApiError } from '@/utils/request'

type ProfileEditorProps = { profile: CurrentUserProfile }

export const ProfileEditor = ({ profile }: ProfileEditorProps) => {
  const save = useSaveUserProfileMutation()
  const fileRef = useRef<HTMLInputElement>(null)
  const draftRef = useRef<ImageDraft | null>(null)
  const [nickname, setNickname] = useState(profile.nickname)
  const [avatarChange, setAvatarChange] = useState<UserAvatarChange | null>(
    null,
  )
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const changed = nickname.trim() !== profile.nickname || avatarChange !== null
  const blocker = useBlocker(changed && !save.isPending)

  useEffect(() => {
    draftRef.current =
      avatarChange?.kind === 'upload' ? avatarChange.draft : null
  }, [avatarChange])

  useEffect(
    () => () => {
      if (draftRef.current) releaseImageDraft(draftRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!changed) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changed])

  const replaceDraft = (draft: ImageDraft) => {
    if (draftRef.current) releaseImageDraft(draftRef.current)
    setAvatarChange({ kind: 'upload', draft })
    setCropFile(null)
    setNotice(null)
  }

  const reset = () => {
    if (draftRef.current) releaseImageDraft(draftRef.current)
    setNickname(profile.nickname)
    setAvatarChange(null)
    setNotice(null)
    setConfirmingCancel(false)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setNotice(null)
    try {
      const result = await save.mutateAsync({
        nickname: nickname.trim(),
        avatarChange,
      })
      setNickname(result.profile.nickname)
      if (result.avatarStatus === 'failed') {
        setNotice('昵称已保存，头像保存失败，请重试头像保存')
      } else {
        draftRef.current = null
        setAvatarChange(null)
        setNotice('个人资料已保存')
      }
    } catch {
      // Mutation state renders the server feedback in place.
    }
  }

  const avatarSource =
    avatarChange?.kind === 'upload'
      ? avatarChange.draft.previewUrl
      : avatarChange?.kind === 'remove'
        ? null
        : profile.avatar

  return (
    <section className="profile-editor" aria-labelledby="profile-editor-title">
      <Toast
        message={notice}
        signal={save.submittedAt}
        type={notice?.includes('失败') ? 'error' : 'success'}
      />
      <Toast
        message={save.error ? toApiError(save.error).message : null}
        signal={save.error}
        type="error"
      />
      <div className="profile-section-heading">
        <div>
          <h2 id="profile-editor-title">基本资料</h2>
        </div>
      </div>
      <form
        className="profile-editor__layout"
        onSubmit={(event) => void submit(event)}
      >
        <div className="profile-avatar-editor">
          <div className="profile-avatar-editor__preview">
            {avatarSource ? (
              <FrontArticleImage
                alt={`${nickname || profile.nickname}的头像`}
                src={avatarSource}
              />
            ) : (
              <UserRound aria-hidden="true" />
            )}
          </div>
          <input
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => {
              setCropFile(event.target.files?.[0] ?? null)
              event.currentTarget.value = ''
            }}
            ref={fileRef}
            type="file"
          />
          <Button
            disabled={save.isPending}
            icon={<Upload />}
            onClick={() => fileRef.current?.click()}
            variant="secondary"
          >
            更换头像
          </Button>
          {(profile.avatar || avatarChange?.kind === 'upload') &&
          avatarChange?.kind !== 'remove' ? (
            <button
              className="profile-avatar-editor__remove"
              disabled={save.isPending}
              onClick={() => setConfirmingRemove(true)}
              type="button"
            >
              <Trash2 />
              移除头像
            </button>
          ) : null}
        </div>
        <div className="profile-editor__fields">
          <FormField htmlFor="profile-nickname" label="昵称" required>
            <Input
              disabled={save.isPending}
              id="profile-nickname"
              maxLength={50}
              onChange={(event) => {
                setNickname(event.target.value)
                setNotice(null)
              }}
              value={nickname}
            />
          </FormField>
          <FormField htmlFor="profile-email" label="登录邮箱">
            <Input
              id="profile-email"
              leftIcon={<LockKeyhole />}
              readOnly
              value={profile.email}
            />
          </FormField>
          <div className="profile-editor__actions">
            <Button
              disabled={!changed || save.isPending}
              onClick={() => setConfirmingCancel(true)}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              disabled={!changed || !nickname.trim()}
              icon={<Check />}
              loading={save.isPending}
              type="submit"
            >
              保存修改
            </Button>
          </div>
        </div>
      </form>
      <ImageCropDialog
        file={cropFile}
        onApply={replaceDraft}
        onClose={() => setCropFile(null)}
        open={Boolean(cropFile)}
        target="avatar"
      />
      <FrontAccountModal
        footer={
          <>
            <Button
              onClick={() => setConfirmingRemove(false)}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (draftRef.current) releaseImageDraft(draftRef.current)
                setAvatarChange({ kind: 'remove' })
                setConfirmingRemove(false)
                setNotice(null)
              }}
              variant="danger"
            >
              移除头像
            </Button>
          </>
        }
        onRequestClose={() => setConfirmingRemove(false)}
        open={confirmingRemove}
        title="移除头像？"
      >
        <p className="account-dialog-copy">保存修改后，当前头像将被移除。</p>
      </FrontAccountModal>
      <FrontAccountModal
        footer={
          <>
            <Button
              onClick={() => setConfirmingCancel(false)}
              variant="secondary"
            >
              继续编辑
            </Button>
            <Button onClick={reset} variant="danger">
              放弃修改
            </Button>
          </>
        }
        onRequestClose={() => setConfirmingCancel(false)}
        open={confirmingCancel}
        title="放弃未保存修改？"
      >
        <p className="account-dialog-copy">昵称和头像的本地修改将不会保留。</p>
      </FrontAccountModal>
      <FrontAccountModal
        footer={
          <>
            <Button onClick={() => blocker.reset?.()} variant="secondary">
              继续编辑
            </Button>
            <Button
              onClick={() => {
                if (draftRef.current) releaseImageDraft(draftRef.current)
                blocker.proceed?.()
              }}
              variant="danger"
            >
              放弃并离开
            </Button>
          </>
        }
        onRequestClose={() => blocker.reset?.()}
        open={blocker.state === 'blocked'}
        title="离开个人资料？"
      >
        <p className="account-dialog-copy">
          尚未保存的昵称和头像修改将会丢失。
        </p>
      </FrontAccountModal>
    </section>
  )
}
