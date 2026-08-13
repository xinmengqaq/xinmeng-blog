import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { FrontAccountModal } from '@/components/front/account'
import { Button, FormField, Input, Toast } from '@/components/ui'
import { useUserAccountSecurity } from '@/queries/userAccountSecurity'
import { toApiError } from '@/utils/request'

export const CancelAccountDialog = ({
  email,
  onClose,
}: {
  email: string
  onClose: () => void
}) => {
  const navigate = useNavigate()
  const security = useUserAccountSecurity()
  const [confirmEmail, setConfirmEmail] = useState('')

  const submit = async () => {
    try {
      const result = await security.cancelAccount.mutateAsync({ confirmEmail })
      navigate('/login', {
        replace: true,
        state: {
          message: `账号已注销，预计删除时间：${new Date(result.deleteAt).toLocaleString('zh-CN')}`,
        },
      })
    } catch {
      // Mutation state renders the server feedback in place.
    }
  }

  return (
    <>
      <Toast
        message={
          security.cancelAccount.error
            ? toApiError(security.cancelAccount.error).message
            : null
        }
        signal={security.cancelAccount.error}
        type="error"
      />
      <FrontAccountModal
        footer={
          <>
            <Button
              disabled={security.cancelAccount.isPending}
              onClick={onClose}
              variant="secondary"
            >
              取消
            </Button>
            <Button
              disabled={
                confirmEmail.trim().toLowerCase() !== email.trim().toLowerCase()
              }
              loading={security.cancelAccount.isPending}
              onClick={() => void submit()}
              variant="danger"
            >
              确认注销账号
            </Button>
          </>
        }
        locked={security.cancelAccount.isPending}
        onRequestClose={onClose}
        open
        title="注销账号"
      >
        <div className="profile-security-form">
          <p className="account-dialog-copy">
            输入当前登录邮箱以确认注销。此操作完成后将退出登录。
          </p>
          <FormField htmlFor="cancel-email" label="当前邮箱" required>
            <Input
              autoComplete="email"
              id="cancel-email"
              onChange={(event) => setConfirmEmail(event.target.value)}
              value={confirmEmail}
            />
          </FormField>
        </div>
      </FrontAccountModal>
    </>
  )
}
