import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Alert,
  Button,
  DataSection,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  PageHeader,
} from '@/components/ui'
import {
  useAdminProfileQuery,
  useChangeAdminPasswordMutation,
  useRefreshAdminTokenMutation,
  useValidateAdminTokenMutation,
} from '@/queries/admin'
import { useAdminAuthStore } from '@/store/auth'
import { toApiError } from '@/utils/request'

import { AdminProfileSection } from './admin-settings/AdminProfileSection'
import './adminPages.css'

type PasswordForm = {
  oldPassword: string
  newPassword: string
}

type TokenStatus = 'unchecked' | 'valid' | 'refreshed'

const tokenStatusLabel: Record<TokenStatus, string> = {
  unchecked: '未校验',
  valid: '有效',
  refreshed: '已刷新',
}

export const AdminSettingsView = () => {
  const navigate = useNavigate()
  const clearAuth = useAdminAuthStore((state) => state.clearAuth)
  const profileQuery = useAdminProfileQuery()
  const changePasswordMutation = useChangeAdminPasswordMutation()
  const validateTokenMutation = useValidateAdminTokenMutation()
  const refreshTokenMutation = useRefreshAdminTokenMutation()
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    oldPassword: '',
    newPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState<Partial<PasswordForm>>(
    {},
  )
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('unchecked')
  const [tokenError, setTokenError] = useState<string | null>(null)

  const tokenStatusClass = `admin-token-status admin-token-status--${tokenStatus}`

  const setPasswordValue = (field: keyof PasswordForm, value: string) => {
    setPasswordForm((current) => ({ ...current, [field]: value }))
    setPasswordErrors((current) => ({ ...current, [field]: undefined }))
    setPasswordError(null)
  }

  const validatePassword = () => {
    const errors: Partial<PasswordForm> = {}

    if (!passwordForm.oldPassword) {
      errors.oldPassword = '旧密码不能为空'
    }

    if (
      passwordForm.newPassword.length < 6 ||
      passwordForm.newPassword.length > 50
    ) {
      errors.newPassword = '新密码长度必须为 6-50 位'
    }

    return errors
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const errors = validatePassword()

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    try {
      await changePasswordMutation.mutateAsync(passwordForm)
      navigate('/admin/login', { replace: true })
    } catch (error) {
      setPasswordError(toApiError(error).message)
    }
  }

  const handleSessionFailure = (error: unknown) => {
    setTokenError(toApiError(error).message)
    clearAuth()
    navigate('/admin/login', { replace: true })
  }

  const handleValidateToken = async () => {
    try {
      const result = await validateTokenMutation.mutateAsync()
      setTokenStatus(result.valid ? 'valid' : 'unchecked')
      setTokenError(result.valid ? null : 'Token 校验未通过')
    } catch (error) {
      handleSessionFailure(error)
    }
  }

  const handleRefreshToken = async () => {
    try {
      await refreshTokenMutation.mutateAsync()
      setTokenStatus('refreshed')
      setTokenError(null)
    } catch (error) {
      handleSessionFailure(error)
    }
  }

  if (profileQuery.isLoading) {
    return <LoadingState description="正在读取管理员资料。" />
  }

  if (profileQuery.isError) {
    return (
      <ErrorState
        description={toApiError(profileQuery.error).message}
        onRetry={() => void profileQuery.refetch()}
      />
    )
  }

  if (!profileQuery.data) {
    return <LoadingState description="正在读取管理员资料。" />
  }

  return (
    <section className="admin-page admin-page--settings">
      <PageHeader
        title="管理员设置"
        description="维护当前管理员资料、密码和 Token 登录状态。"
      />

      <AdminProfileSection profile={profileQuery.data} />

      <form onSubmit={handlePasswordSubmit}>
        <input
          aria-hidden="true"
          autoComplete="username"
          className="admin-visually-hidden"
          name="username"
          readOnly
          tabIndex={-1}
          type="text"
          value={profileQuery.data.username}
        />
        <DataSection
          title="修改密码"
          description="修改成功后将清理登录态，需要重新登录。"
          footer={
            <Button loading={changePasswordMutation.isPending} type="submit">
              修改密码
            </Button>
          }
        >
          <div className="admin-form-grid admin-form-grid--two">
            <FormField
              label="旧密码"
              htmlFor="admin-password-old"
              required
              error={passwordErrors.oldPassword}
            >
              <Input
                id="admin-password-old"
                autoComplete="current-password"
                type="password"
                value={passwordForm.oldPassword}
                error={Boolean(passwordErrors.oldPassword)}
                onChange={(event) =>
                  setPasswordValue('oldPassword', event.target.value)
                }
              />
            </FormField>
            <FormField
              label="新密码"
              htmlFor="admin-password-new"
              required
              error={passwordErrors.newPassword}
            >
              <Input
                id="admin-password-new"
                autoComplete="new-password"
                type="password"
                value={passwordForm.newPassword}
                error={Boolean(passwordErrors.newPassword)}
                onChange={(event) =>
                  setPasswordValue('newPassword', event.target.value)
                }
              />
            </FormField>
          </div>
          {passwordError ? <Alert type="error">{passwordError}</Alert> : null}
        </DataSection>
      </form>

      <DataSection
        title="登录状态"
        description="Token 校验和刷新失败时会清理登录态，并回到登录页。"
        footer={
          <>
            <Button
              loading={validateTokenMutation.isPending}
              onClick={handleValidateToken}
              variant="secondary"
            >
              校验 Token
            </Button>
            <Button
              loading={refreshTokenMutation.isPending}
              onClick={handleRefreshToken}
              variant="secondary"
            >
              刷新 Token
            </Button>
          </>
        }
      >
        <div className="admin-token-row">
          <span>Token 状态</span>
          <span className={tokenStatusClass}>
            {tokenStatusLabel[tokenStatus]}
          </span>
        </div>
        {tokenError ? <Alert type="error">{tokenError}</Alert> : null}
      </DataSection>
    </section>
  )
}
