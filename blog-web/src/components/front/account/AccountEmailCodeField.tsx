import { Button, FormField, Input } from '@/components/ui'

import './accountGuest.css'

type AccountEmailCodeFieldProps = {
  code: string
  disabled?: boolean
  id: string
  resendSeconds: number
  onChange: (value: string) => void
  onRequestNew: () => void
}

export const AccountEmailCodeField = ({
  code,
  disabled,
  id,
  resendSeconds,
  onChange,
  onRequestNew,
}: AccountEmailCodeFieldProps) => (
  <FormField htmlFor={id} label="邮件验证码" required>
    <div className="account-email-code">
      <Input
        autoComplete="one-time-code"
        disabled={disabled}
        id={id}
        inputMode="numeric"
        maxLength={6}
        onChange={(event) => onChange(event.target.value)}
        value={code}
      />
      {resendSeconds > 0 ? (
        <span className="account-email-code__countdown" role="timer">
          {resendSeconds} 秒后重发
        </span>
      ) : (
        <Button
          className="account-email-code__restart"
          disabled={disabled}
          onClick={onRequestNew}
          variant="secondary"
        >
          重新获取
        </Button>
      )}
    </div>
  </FormField>
)
