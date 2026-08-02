import type { ChangeEvent } from 'react'

import './ui.css'

type SwitchProps = {
  checked: boolean
  label: string
  description?: string
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export const Switch = ({
  checked,
  label,
  description,
  disabled,
  onChange,
}: SwitchProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked)
  }

  return (
    <label className={`ui-switch ${disabled ? 'ui-switch--disabled' : ''}`}>
      <input
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        type="checkbox"
      />
      <span aria-hidden="true" className="ui-switch__track">
        <span className="ui-switch__thumb" />
      </span>
      <span className="ui-switch__copy">
        <span className="ui-switch__label">{label}</span>
        {description ? (
          <span className="ui-switch__description">{description}</span>
        ) : null}
      </span>
    </label>
  )
}
