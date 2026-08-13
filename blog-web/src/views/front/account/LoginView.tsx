import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import {
  AccountGuestShell,
  AccountPasswordField,
  FrontAccountModal,
} from '@/components/front/account'
import { Button, FormField, Input, Toast } from '@/components/ui'
import { consumeUserLoginRedirect } from '@/router/guardUtils'
import { useUserLoginFlow } from '@/queries/userAuth'
import { toApiError } from '@/utils/request'

type LoginLocationState = { email?: string; message?: string }

export const UserLoginView = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const flow = useUserLoginFlow()
  const routeState = location.state as LoginLocationState | null
  const [routeNotice] = useState(routeState)
  const [email, setEmail] = useState(routeNotice?.email ?? '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [redirect] = useState(() => consumeUserLoginRedirect())

  useEffect(() => {
    if (routeState) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, navigate, routeState])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const result = await flow.login.mutateAsync({
        credentials: { email: email.trim(), password, rememberMe },
        returnTo: redirect?.returnTo,
      })
      setPassword('')
      navigate(result.redirectTo, { replace: true })
    } catch {
      // Mutation state renders the server feedback in place.
    }
  }

  const restore = async () => {
    try {
      const result = await flow.restore.mutateAsync()
      setEmail(result.email)
      setPassword('')
    } catch {
      // Mutation state renders the server feedback in place.
    }
  }

  const pending = flow.login.isPending || flow.restore.isPending
  const loginError =
    flow.login.error && !flow.recoveryEmail
      ? toApiError(flow.login.error).message
      : null
  const restoreError = flow.restore.error
    ? toApiError(flow.restore.error).message
    : null
  const restoreSuccess = flow.restore.data?.message ?? null
  const errorMessage =
    restoreError ??
    (restoreSuccess ? null : (loginError ?? redirect?.message ?? null))
  const toastMessage = errorMessage ?? restoreSuccess ?? routeNotice?.message
  const toastType = errorMessage ? 'error' : 'success'

  return (
    <AccountGuestShell activeTab="login" tabs title="欢迎回来">
      <Toast
        message={toastMessage}
        signal={flow.restore.submittedAt}
        type={toastType}
      />
      <form className="account-form" onSubmit={(event) => void submit(event)}>
        <FormField htmlFor="login-email" label="邮箱" required>
          <Input
            autoComplete="email"
            disabled={pending}
            id="login-email"
            leftIcon={<Mail />}
            maxLength={50}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </FormField>
        <AccountPasswordField
          autoComplete="current-password"
          disabled={pending}
          id="login-password"
          label="密码"
          onChange={setPassword}
          value={password}
        />
        <label className="account-form__check">
          <input
            checked={rememberMe}
            disabled={pending}
            onChange={(event) => setRememberMe(event.target.checked)}
            type="checkbox"
          />
          <span>记住我</span>
        </label>
        <Button
          className="account-form__submit"
          loading={flow.login.isPending}
          type="submit"
        >
          {flow.login.isPending ? '登录中' : '登录'}
        </Button>
        <Link className="account-form__secondary-link" to="/forgot-password">
          忘记密码？
        </Link>
      </form>
      <FrontAccountModal
        footer={
          <>
            <Button
              disabled={pending}
              onClick={flow.cancelRecovery}
              variant="secondary"
            >
              暂不恢复
            </Button>
            <Button
              loading={flow.restore.isPending}
              onClick={() => void restore()}
            >
              恢复账号
            </Button>
          </>
        }
        locked={flow.restore.isPending}
        onRequestClose={flow.cancelRecovery}
        open={Boolean(flow.recoveryEmail)}
        title="恢复待删除账号"
      >
        <p className="account-dialog-copy">
          该账号正在等待删除。恢复后请重新登录。
        </p>
      </FrontAccountModal>
    </AccountGuestShell>
  )
}
