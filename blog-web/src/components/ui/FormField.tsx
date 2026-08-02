import type { ReactNode } from 'react'

import './ui.css'

type FormFieldProps = {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}

export const FormField = ({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: FormFieldProps) => (
  <div className="ui-form-field">
    <label className="ui-form-field__label" htmlFor={htmlFor}>
      <span>{label}</span>
      {required ? <span className="ui-form-field__required">*</span> : null}
    </label>
    <div className="ui-form-field__control">{children}</div>
    {error ? <p className="ui-form-field__error">{error}</p> : null}
    {!error && hint ? <p className="ui-form-field__hint">{hint}</p> : null}
  </div>
)
