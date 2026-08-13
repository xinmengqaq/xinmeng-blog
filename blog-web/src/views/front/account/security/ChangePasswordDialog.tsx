import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  AccountPasswordField,
  FrontAccountModal,
} from '@/components/front/account'
import { Button, Toast } from '@/components/ui'
import { useUserAccountSecurity } from '@/queries/userAccountSecurity'
import { toApiError } from '@/utils/request'

export const ChangePasswordDialog = ({
  email,
  onClose,
}: {
  email: string
  onClose: () => void
}) => {
  const navigate = useNavigate()
  const security = useUserAccountSecurity()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const submit = async () => {
    try {
      await security.changePassword.mutateAsync({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      navigate('/login', {
        replace: true,
        state: { email, message: '密码修改成功，请重新登录' },
      })
    } catch {
      // Mutation state renders the server feedback in place.
    }
  }

  return (
    <>
      <Toast
        message={
          security.changePassword.error
            ? toApiError(security.changePassword.error).message
            : null
        }
        signal={security.changePassword.error}
        type="error"
      />
      <FrontAccountModal
        footer={
          <>
            <Button
              disabled={security.changePassword.isPending}
              onClick={onClose}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              disabled={!currentPassword || !newPassword || !confirmPassword}
              loading={security.changePassword.isPending}
              onClick={() => void submit()}
            >
              确认修改密码
            </Button>
          </>
        }
        locked={security.changePassword.isPending}
        onRequestClose={onClose}
        open
        title="修改密码"
      >
        <div className="profile-security-form">
          <AccountPasswordField
            autoComplete="current-password"
            id="password-current"
            label="当前密码"
            onChange={setCurrentPassword}
            value={currentPassword}
          />
          <AccountPasswordField
            autoComplete="new-password"
            id="password-new"
            label="新密码"
            onChange={setNewPassword}
            value={newPassword}
          />
          <AccountPasswordField
            autoComplete="new-password"
            id="password-confirm"
            label="确认新密码"
            onChange={setConfirmPassword}
            value={confirmPassword}
          />
        </div>
      </FrontAccountModal>
    </>
  )
}
