import { RefreshCw } from 'lucide-react'

import { Button, FormField, Input } from '@/components/ui'
import type { UserCaptcha } from '@/types/userAuth'

type AccountCaptchaFieldProps = {
  captcha: UserCaptcha | null
  code: string
  error: string | null
  loading: boolean
  disabled?: boolean
  onChange: (value: string) => void
  onImageError: () => void
  onRefresh: () => void
}

export const AccountCaptchaField = ({
  captcha,
  code,
  error,
  loading,
  disabled,
  onChange,
  onImageError,
  onRefresh,
}: AccountCaptchaFieldProps) => (
  <FormField
    error={error ?? undefined}
    htmlFor="captcha-code"
    label="图形验证码"
    required
  >
    <div className="account-captcha">
      <Input
        autoComplete="off"
        disabled={disabled || loading}
        id="captcha-code"
        inputMode="text"
        maxLength={4}
        onChange={(event) => onChange(event.target.value)}
        value={code}
      />
      <div className="account-captcha__image" aria-live="polite">
        {captcha ? (
          <img
            alt="图形验证码"
            onError={onImageError}
            src={`data:image/png;base64,${captcha.imageBase64}`}
          />
        ) : (
          <span>{loading ? '加载中' : '加载失败'}</span>
        )}
      </div>
      <Button
        aria-label="刷新图形验证码"
        className="account-captcha__refresh"
        disabled={disabled || loading}
        icon={<RefreshCw />}
        onClick={onRefresh}
        title="刷新图形验证码"
        variant="ghost"
      />
    </div>
  </FormField>
)
