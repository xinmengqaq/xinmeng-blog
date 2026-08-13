import { Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  AccountCaptchaField,
  AccountEmailCodeField,
  AccountGuestShell,
  AccountPasswordField,
  AccountStage,
} from '@/components/front/account'
import { Button, FormField, Input, Toast } from '@/components/ui'
import { useAccountCaptcha } from '@/hooks/front/useAccountCaptcha'
import { useUserRegistrationFlow } from '@/queries/userRegistration'
import { toApiError } from '@/utils/request'

export const UserRegisterView = () => {
  const navigate = useNavigate()
  const captcha = useAccountCaptcha()
  const flow = useUserRegistrationFlow()
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const sendCode = async () => {
    if (!captcha.captcha) return
    setLocalError(null)
    try {
      await flow.sendCode.mutateAsync({
        email: flow.email.trim(),
        captchaId: captcha.captcha.captchaId,
        captchaCode: captcha.code,
      })
    } catch {
      await captcha.replaceAfterSendFailure()
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setLocalError('两次输入的密码不一致')
      return
    }
    setLocalError(null)
    try {
      const result = await flow.register.mutateAsync({
        email: flow.email.trim(),
        emailCode: flow.emailCode,
        nickname: nickname.trim(),
        password,
      })
      navigate('/login', {
        replace: true,
        state: { email: result.email, message: '注册成功，请登录' },
      })
    } catch {
      // Mutation state renders the server feedback in place.
    }
  }

  const pending = flow.sendCode.isPending || flow.register.isPending
  const requestError = flow.sendCode.error ?? flow.register.error

  return (
    <AccountGuestShell activeTab="register" tabs title="创建账号">
      <Toast
        message={requestError ? toApiError(requestError).message : null}
        signal={requestError}
        type="error"
      />
      <form className="account-form" onSubmit={(event) => void submit(event)}>
        <FormField htmlFor="register-email" label="邮箱" required>
          <Input
            autoComplete="email"
            disabled={pending}
            id="register-email"
            leftIcon={<Mail />}
            maxLength={320}
            onChange={(event) => {
              const shouldRefreshCaptcha = flow.isCodeSent
              flow.changeEmail(event.target.value)
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
            id="register-email-code"
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
            <FormField htmlFor="register-nickname" label="昵称" required>
              <Input
                autoComplete="nickname"
                id="register-nickname"
                leftIcon={<UserRound />}
                maxLength={50}
                onChange={(event) => setNickname(event.target.value)}
                value={nickname}
              />
            </FormField>
            <AccountPasswordField
              autoComplete="new-password"
              id="register-password"
              label="密码"
              onChange={setPassword}
              value={password}
            />
            <AccountPasswordField
              autoComplete="new-password"
              error={localError ?? undefined}
              id="register-confirm-password"
              label="确认密码"
              onChange={setConfirmPassword}
              value={confirmPassword}
            />
            <Button
              className="account-form__submit"
              loading={flow.register.isPending}
              type="submit"
            >
              注册
            </Button>
          </AccountStage>
        ) : null}
      </form>
    </AccountGuestShell>
  )
}
