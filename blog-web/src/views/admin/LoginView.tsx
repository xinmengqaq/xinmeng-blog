import { RefreshCw } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Alert, Button, FormField, Input } from '@/components/ui'
import { getAdminCaptcha } from '@/api/auth'
import { useLoginMutation } from '@/queries/auth'
import type { AdminCaptcha, LoginParams } from '@/types/auth'
import { toApiError } from '@/utils/request'

import './adminPages.css'

type LoginForm = Pick<LoginParams, 'username' | 'password' | 'captchaCode'>

type LoginFieldErrors = Partial<Record<keyof LoginForm, string>>

const initialForm: LoginForm = {
  username: '',
  password: '',
  captchaCode: '',
}

export const LoginView = () => {
  const navigate = useNavigate()
  const loginMutation = useLoginMutation()
  const [form, setForm] = useState<LoginForm>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [captcha, setCaptcha] = useState<AdminCaptcha | null>(null)
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(true)
  const hasRequestedInitialCaptcha = useRef(false)
  const captchaRequestVersion = useRef(0)

  const setFieldValue = (field: keyof LoginForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError(null)
  }

  const loadCaptcha = useCallback(async () => {
    const requestVersion = captchaRequestVersion.current + 1
    captchaRequestVersion.current = requestVersion

    setCaptcha(null)
    setCaptchaError(null)
    setIsCaptchaLoading(true)
    setForm((current) => ({ ...current, captchaCode: '' }))
    setFieldErrors((current) => ({ ...current, captchaCode: undefined }))

    try {
      const nextCaptcha = await getAdminCaptcha()

      if (requestVersion !== captchaRequestVersion.current) {
        return
      }

      if (!nextCaptcha.captchaId.trim() || !nextCaptcha.imageBase64.trim()) {
        throw {
          code: 'CAPTCHA_INVALID',
          message: '验证码数据无效，请重新加载',
        }
      }

      setCaptcha(nextCaptcha)
    } catch (error) {
      if (requestVersion === captchaRequestVersion.current) {
        setCaptchaError(toApiError(error).message)
      }
    } finally {
      if (requestVersion === captchaRequestVersion.current) {
        setIsCaptchaLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (hasRequestedInitialCaptcha.current) {
      return
    }

    hasRequestedInitialCaptcha.current = true
    void loadCaptcha()
  }, [loadCaptcha])

  const validate = () => {
    const errors: LoginFieldErrors = {}

    if (!form.username.trim()) {
      errors.username = '用户名不能为空'
    }

    if (!form.password) {
      errors.password = '密码不能为空'
    }

    if (!captcha) {
      errors.captchaCode = '请先加载验证码'
    } else if (!form.captchaCode.trim()) {
      errors.captchaCode = '验证码不能为空'
    }

    return errors
  }

  const handleCaptchaRefresh = () => {
    if (isCaptchaLoading || loginMutation.isPending) {
      return
    }

    setSubmitError(null)
    void loadCaptcha()
  }

  const handleCaptchaImageError = (captchaId: string) => {
    if (captcha?.captchaId !== captchaId) {
      return
    }

    setCaptcha(null)
    setCaptchaError('验证码图片加载失败，请重新加载')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const errors = validate()

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    try {
      await loginMutation.mutateAsync({
        username: form.username.trim(),
        password: form.password,
        captchaID: captcha!.captchaId,
        captchaCode: form.captchaCode.trim(),
      })
      navigate('/admin', { replace: true })
    } catch (error) {
      setSubmitError(toApiError(error).message)
      void loadCaptcha()
    }
  }

  const captchaImageSrc = captcha
    ? `data:image/png;base64,${captcha.imageBase64}`
    : null
  const isLoginDisabled =
    loginMutation.isPending || isCaptchaLoading || captcha === null

  return (
    <section className="admin-login-page">
      <div className="admin-login-brand">
        <strong>个人博客后台</strong>
      </div>

      <div className="admin-login-form-pane">
        <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
          <header className="admin-login-form__header">
            <h1>后台登录</h1>
          </header>

          {submitError ? <Alert type="error">{submitError}</Alert> : null}

          <FormField
            label="用户名"
            htmlFor="admin-login-username"
            error={fieldErrors.username}
          >
            <Input
              id="admin-login-username"
              name="username"
              autoComplete="username"
              value={form.username}
              error={Boolean(fieldErrors.username)}
              onChange={(event) =>
                setFieldValue('username', event.target.value)
              }
            />
          </FormField>

          <FormField
            label="密码"
            htmlFor="admin-login-password"
            error={fieldErrors.password}
          >
            <Input
              id="admin-login-password"
              name="password"
              autoComplete="current-password"
              type="password"
              value={form.password}
              error={Boolean(fieldErrors.password)}
              onChange={(event) =>
                setFieldValue('password', event.target.value)
              }
            />
          </FormField>

          <FormField
            label="验证码"
            htmlFor="admin-login-captcha"
            error={fieldErrors.captchaCode}
          >
            <div
              className={`admin-login-captcha${
                fieldErrors.captchaCode ? ' admin-login-captcha--error' : ''
              }`}
            >
              <Input
                id="admin-login-captcha"
                name="captchaCode"
                autoComplete="off"
                className="admin-login-captcha__input"
                disabled={isLoginDisabled}
                error={Boolean(fieldErrors.captchaCode)}
                inputMode="text"
                maxLength={4}
                placeholder="输入图中字符"
                spellCheck={false}
                value={form.captchaCode}
                onChange={(event) =>
                  setFieldValue('captchaCode', event.target.value)
                }
              />

              <button
                aria-label="刷新验证码"
                className={`admin-login-captcha__image${
                  isCaptchaLoading ? ' admin-login-captcha__image--loading' : ''
                }`}
                disabled={isCaptchaLoading || loginMutation.isPending}
                onClick={handleCaptchaRefresh}
                title="刷新验证码"
                type="button"
              >
                {captchaImageSrc && captcha ? (
                  <img
                    alt="验证码图片"
                    onError={() => handleCaptchaImageError(captcha.captchaId)}
                    src={captchaImageSrc}
                  />
                ) : (
                  <span className="admin-login-captcha__placeholder">
                    {isCaptchaLoading ? '加载中' : '无法加载'}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="admin-login-captcha__refresh"
                >
                  <RefreshCw />
                </span>
              </button>
            </div>
            {captchaError ? <Alert type="error">{captchaError}</Alert> : null}
            <span className="admin-visually-hidden" aria-live="polite">
              {isCaptchaLoading ? '正在加载验证码' : ''}
            </span>
          </FormField>

          <Button
            className="admin-login-form__submit"
            disabled={isLoginDisabled}
            loading={loginMutation.isPending}
            type="submit"
          >
            {loginMutation.isPending ? '登录中' : '登录后台'}
          </Button>
        </form>
      </div>
    </section>
  )
}
