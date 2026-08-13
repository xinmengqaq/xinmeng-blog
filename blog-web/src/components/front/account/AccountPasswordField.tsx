import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useState } from 'react'

import { FormField, Input } from '@/components/ui'

type AccountPasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  error?: string
  disabled?: boolean
}

export const AccountPasswordField = ({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  disabled,
}: AccountPasswordFieldProps) => {
  const [visible, setVisible] = useState(false)

  return (
    <FormField error={error} htmlFor={id} label={label} required>
      <div className="account-password-field">
        <Input
          autoComplete={autoComplete}
          disabled={disabled}
          error={Boolean(error)}
          id={id}
          leftIcon={<LockKeyhole />}
          maxLength={64}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={visible ? `隐藏${label}` : `显示${label}`}
          className="account-password-field__toggle"
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          title={visible ? `隐藏${label}` : `显示${label}`}
          type="button"
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>
    </FormField>
  )
}
