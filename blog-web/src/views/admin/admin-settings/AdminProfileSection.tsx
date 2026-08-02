import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import { Button, DataSection, FormField, Input, Alert } from '@/components/ui'
import { useSaveAdminProfileWithAvatarMutation } from '@/queries/admin'
import type { AdminVO } from '@/types/auth'
import type { AdminAvatarChange } from '@/types/file'
import { releaseImageDraft } from '@/utils/imageDrafts'
import { toApiError } from '@/utils/request'

import { AdminAvatarEditor } from './AdminAvatarEditor'

type ProfileForm = {
  username: string
  role: string
  name: string
}

type AdminProfileSectionProps = {
  profile: AdminVO
}

const toProfileForm = (profile: AdminVO): ProfileForm => ({
  username: profile.username,
  role: profile.role,
  name: profile.name,
})

export const AdminProfileSection = ({ profile }: AdminProfileSectionProps) => {
  const saveProfileMutation = useSaveAdminProfileWithAvatarMutation()
  const [profileForm, setProfileForm] = useState<ProfileForm>(() =>
    toProfileForm(profile),
  )
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [avatarChange, setAvatarChangeState] =
    useState<AdminAvatarChange | null>(null)
  const avatarChangeRef = useRef<AdminAvatarChange | null>(null)

  useEffect(() => {
    setProfileForm(toProfileForm(profile))
  }, [profile])

  useEffect(
    () => () => {
      const pendingChange = avatarChangeRef.current

      if (pendingChange?.kind === 'upload') {
        releaseImageDraft(pendingChange.draft)
      }
    },
    [],
  )

  const setAvatarChange = useCallback(
    (nextChange: AdminAvatarChange | null) => {
      const currentChange = avatarChangeRef.current

      if (
        currentChange?.kind === 'upload' &&
        (nextChange?.kind !== 'upload' ||
          currentChange.draft !== nextChange.draft)
      ) {
        releaseImageDraft(currentChange.draft)
      }

      avatarChangeRef.current = nextChange
      setAvatarChangeState(nextChange)
    },
    [],
  )

  const setProfileValue = (field: keyof ProfileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }))
    setProfileError(null)
    setProfileSuccess(null)
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const username = profileForm.username.trim()
    const name = profileForm.name.trim()

    if (!username) {
      setProfileError('管理员用户名不能为空')
      return
    }

    if (!name) {
      setProfileError('管理员名称不能为空')
      return
    }

    try {
      const result = await saveProfileMutation.mutateAsync({
        avatarChange,
        profile: { username, name },
      })
      setProfileForm(toProfileForm(result.profile))

      if (result.avatarStatus === 'failed') {
        setProfileError(result.avatarError?.message ?? '头像保存失败，请重试')
        setProfileSuccess('资料已保存，头像变更仍待保存')
        return
      }

      if (result.avatarStatus === 'saved') {
        setAvatarChange(null)
      }

      setProfileSuccess('资料已保存')
      setProfileError(null)
    } catch (error) {
      setProfileError(toApiError(error).message)
      setProfileSuccess(null)
    }
  }

  const hasProfileFieldError =
    profileError === '管理员用户名不能为空' ||
    profileError === '管理员名称不能为空'

  return (
    <form onSubmit={handleProfileSubmit}>
      <DataSection
        title="管理员资料"
        footer={
          <Button loading={saveProfileMutation.isPending} type="submit">
            保存资料
          </Button>
        }
      >
        <div className="admin-profile-editor">
          <AdminAvatarEditor
            avatarChange={avatarChange}
            currentAvatar={profile.avatar ?? ''}
            disabled={saveProfileMutation.isPending}
            onAvatarChange={setAvatarChange}
          />
          <div className="admin-form-grid admin-form-grid--two admin-profile-fields">
            <FormField
              label="用户名"
              htmlFor="admin-profile-username"
              required
              error={
                profileError === '管理员用户名不能为空'
                  ? profileError
                  : undefined
              }
            >
              <Input
                id="admin-profile-username"
                value={profileForm.username}
                error={profileError === '管理员用户名不能为空'}
                onChange={(event) =>
                  setProfileValue('username', event.target.value)
                }
              />
            </FormField>
            <FormField label="角色" htmlFor="admin-profile-role">
              <Input
                id="admin-profile-role"
                readOnly
                value={profileForm.role}
              />
            </FormField>
            <div className="admin-profile-fields__name">
              <FormField
                label="管理员名称"
                htmlFor="admin-profile-name"
                required
                error={
                  profileError === '管理员名称不能为空'
                    ? profileError
                    : undefined
                }
              >
                <Input
                  id="admin-profile-name"
                  value={profileForm.name}
                  error={profileError === '管理员名称不能为空'}
                  onChange={(event) =>
                    setProfileValue('name', event.target.value)
                  }
                />
              </FormField>
            </div>
          </div>
        </div>
        {profileSuccess ? <Alert type="success">{profileSuccess}</Alert> : null}
        {profileError && !hasProfileFieldError ? (
          <Alert type="error">{profileError}</Alert>
        ) : null}
      </DataSection>
    </form>
  )
}
