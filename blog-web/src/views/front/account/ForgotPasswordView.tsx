import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import {
  AccountCaptchaField,
  AccountEmailCodeField,
  AccountGuestShell,
  AccountPasswordField,
  AccountStage,
} from '@/components/front/account'
import { Button, FormField, Input, Toast } from '@/components/ui'
import { useAccountCaptcha } from '@/hooks/front/useAccountCaptcha'
import { useUserPasswordResetFlow } from '@/queries/userPasswordReset'
import { useUserAuthStore } from '@/store/userAuth'
import { toApiError } from '@/utils/request'

export const UserForgotPasswordView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const captcha = useAccountCaptcha()
  const fromProfile =
    (location.state as { fromProfile?: unknown } | null)?.fromProfile === true
  const profileEmail = (location.state as { email?: unknown } | null)?.email
  const flow = useUserPasswordResetFlow(
    typeof profileEmail === 'string' ? profileEmail : '',
  )
  const [notice, setNotice] = useState<string | null>(null)

  const sendCode = async () => {
    if (!captcha.captcha) return
    try {
      const result = await flow.sendCode.mutateAsync({
        email: flow.email.trim(),
        captchaId: captcha.captcha.captchaId,
        captchaCode: captcha.code,
      })
      setNotice(result.message)
    } catch {
      setNotice(null)
      await captcha.replaceAfterSendFailure()
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const result = await flow.reset.mutateAsync()
      if (fromProfile) useUserAuthStore.getState().clearAuth()
      navigate('/login', {
        replace: result.replace,
        state: { email: result.email, message: result.message },
      })
    } catch {
      // Mutation state renders the server feedback in place.
    }
  }

  const pending = flow.sendCode.isPending || flow.reset.isPending
  const requestError = flow.sendCode.error ?? flow.reset.error

  return (
    <AccountGuestShell title="找回密码">
      <Toast
        message={notice}
        signal={flow.sendCode.submittedAt}
        type="success"
      />
      <Toast
        message={requestError ? toApiError(requestError).message : null}
        signal={requestError}
        type="error"
      />
      <Link
        className="account-form__back"
        to={fromProfile ? '/profile' : '/login'}
      >
        <ArrowLeft />
        {fromProfile ? '返回个人资料' : '返回登录'}
      </Link>
      <form className="account-form" onSubmit={(event) => void submit(event)}>
        <FormField htmlFor="reset-email" label="邮箱" required>
          <Input
            autoComplete="email"
            disabled={pending}
            id="reset-email"
            leftIcon={<Mail />}
            maxLength={320}
            onChange={(event) => {
              const shouldRefreshCaptcha = flow.isCodeSent
              flow.changeEmail(event.target.value)
              setNotice(null)
              if (shouldRefreshCaptcha) void captcha.refresh()
            }}
            required
            type="email"
            value={flow.email}
          />
        </FormField>
        {flow.isCodeSent ? (
          <AccountEmailCodeField
            code={flow.emailCode}
            disabled={pending}
            id="reset-email-code"
            onChange={flow.setEmailCode}
            onRequestNew={() => {
              flow.requestNewCode()
              void captcha.refresh()
            }}
            resendSeconds={flow.resendSeconds}
          />
        ) : (
          <>
            <AccountCaptchaField
              captcha={captcha.captcha}
              code={captcha.code}
              disabled={pending}
              error={captcha.error}
              loading={captcha.isLoading}
              onChange={captcha.setCode}
              onImageError={captcha.rejectImage}
              onRefresh={() => void captcha.refresh()}
            />
            <Button
              className="account-form__code-button"
              disabled={
                !captcha.canSubmit || !flow.email || !captcha.code || pending
              }
              loading={flow.sendCode.isPending}
              onClick={() => void sendCode()}
              variant="secondary"
            >
              发送验证码
            </Button>
          </>
        )}
        {flow.isCodeSent ? (
          <AccountStage>
            <AccountPasswordField
              autoComplete="new-password"
              id="reset-password"
              label="新密码"
              onChange={flow.setNewPassword}
              value={flow.newPassword}
            />
            <AccountPasswordField
              autoComplete="new-password"
              id="reset-confirm-password"
              label="确认新密码"
              onChange={flow.setConfirmPassword}
              value={flow.confirmPassword}
            />
            <Button
              className="account-form__submit"
              loading={flow.reset.isPending}
              type="submit"
            >
              重置密码
            </Button>
          </AccountStage>
        ) : null}
      </form>
    </AccountGuestShell>
  )
}
