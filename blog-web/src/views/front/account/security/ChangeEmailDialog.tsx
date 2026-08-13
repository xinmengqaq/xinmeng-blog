import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  AccountCaptchaField,
  AccountEmailCodeField,
  AccountPasswordField,
  FrontAccountModal,
} from '@/components/front/account'
import { Button, FormField, Input, Toast } from '@/components/ui'
import { useAccountCaptcha } from '@/hooks/front/useAccountCaptcha'
import { useUserAccountSecurity } from '@/queries/userAccountSecurity'
import { toApiError } from '@/utils/request'

const RESEND_SECONDS = 60

export const ChangeEmailDialog = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate()
  const security = useUserAccountSecurity()
  const captcha = useAccountCaptcha()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const pending =
    security.sendEmailCode.isPending || security.changeEmail.isPending

  useEffect(() => {
    if (resendSeconds === 0) return
    const timer = window.setInterval(
      () => setResendSeconds((current) => Math.max(0, current - 1)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [resendSeconds])

  const sendCode = async () => {
    if (!captcha.captcha) return
    try {
      await security.sendEmailCode.mutateAsync({
        currentPassword,
        newEmail: newEmail.trim(),
        captchaId: captcha.captcha.captchaId,
        captchaCode: captcha.code,
      })
      setCodeSent(true)
      setEmailCode('')
      setResendSeconds(RESEND_SECONDS)
    } catch {
      await captcha.replaceAfterSendFailure()
    }
  }

  const submit = async () => {
    try {
      const result = await security.changeEmail.mutateAsync({
        currentPassword,
        newEmail: newEmail.trim(),
        emailCode,
      })
      navigate('/login', {
        replace: result.replace,
        state: { email: result.email, message: result.message },
      })
    } catch {
      // Mutation state renders the server feedback in place.
    }
  }

  const error = security.sendEmailCode.error ?? security.changeEmail.error

  return (
    <>
      <Toast
        message={error ? toApiError(error).message : null}
        signal={error}
        type="error"
      />
      <FrontAccountModal
        footer={
          <>
            <Button disabled={pending} onClick={onClose} variant="secondary">
              取消
            </Button>
            {codeSent ? (
              <Button
                disabled={!emailCode}
                loading={security.changeEmail.isPending}
                onClick={() => void submit()}
              >
                确认修改邮箱
              </Button>
            ) : (
              <Button
                disabled={
                  !captcha.canSubmit ||
                  !currentPassword ||
                  !newEmail ||
                  !captcha.code
                }
                loading={security.sendEmailCode.isPending}
                onClick={() => void sendCode()}
              >
                发送验证码
              </Button>
            )}
          </>
        }
        locked={pending}
        onRequestClose={onClose}
        open
        title={codeSent ? '确认新邮箱' : '修改邮箱'}
      >
        <div className="profile-security-form">
          <AccountPasswordField
            autoComplete="current-password"
            disabled={pending || codeSent}
            id="email-current-password"
            label="当前密码"
            onChange={setCurrentPassword}
            value={currentPassword}
          />
          <FormField htmlFor="new-email" label="新邮箱" required>
            <Input
              disabled={pending || codeSent}
              id="new-email"
              onChange={(event) => setNewEmail(event.target.value)}
              type="email"
              value={newEmail}
            />
          </FormField>
          {codeSent ? (
            <AccountEmailCodeField
              code={emailCode}
              disabled={pending}
              id="new-email-code"
              onChange={setEmailCode}
              onRequestNew={() => {
                setCodeSent(false)
                setEmailCode('')
                setResendSeconds(0)
                void captcha.refresh()
              }}
              resendSeconds={resendSeconds}
            />
          ) : (
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
          )}
        </div>
      </FrontAccountModal>
    </>
  )
}
