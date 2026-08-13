import { ChevronRight, KeyRound, Mail, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { CurrentUserProfile } from '@/types/userAuth'

import { CancelAccountDialog } from './security/CancelAccountDialog'
import { ChangeEmailDialog } from './security/ChangeEmailDialog'
import { ChangePasswordDialog } from './security/ChangePasswordDialog'

type SecurityAction = 'email' | 'password' | 'cancel' | null

export const ProfileSecurity = ({
  profile,
}: {
  profile: CurrentUserProfile
}) => {
  const navigate = useNavigate()
  const [action, setAction] = useState<SecurityAction>(null)

  return (
    <section
      className="profile-security"
      aria-labelledby="profile-security-title"
    >
      <div className="profile-section-heading">
        <div>
          <h2 id="profile-security-title">账户安全</h2>
        </div>
      </div>
      <div className="profile-security__list">
        <button onClick={() => setAction('email')} type="button">
          <Mail />
          <span>
            <strong>修改邮箱</strong>
            <small>{profile.email}</small>
          </span>
          <ChevronRight />
        </button>
        <button onClick={() => setAction('password')} type="button">
          <KeyRound />
          <span>
            <strong>修改密码</strong>
            <small>更新登录密码</small>
          </span>
          <ChevronRight />
        </button>
        <button
          onClick={() =>
            navigate('/forgot-password', {
              state: { fromProfile: true, email: profile.email },
            })
          }
          type="button"
        >
          <KeyRound />
          <span>
            <strong>找回密码</strong>
            <small>忘记当前密码时重置</small>
          </span>
          <ChevronRight />
        </button>
        <button
          className="is-danger"
          onClick={() => setAction('cancel')}
          type="button"
        >
          <Trash2 />
          <span>
            <strong>注销账号</strong>
            <small>账号将进入待删除状态</small>
          </span>
          <ChevronRight />
        </button>
      </div>
      {action === 'email' ? (
        <ChangeEmailDialog onClose={() => setAction(null)} />
      ) : null}
      {action === 'password' ? (
        <ChangePasswordDialog
          email={profile.email}
          onClose={() => setAction(null)}
        />
      ) : null}
      {action === 'cancel' ? (
        <CancelAccountDialog
          email={profile.email}
          onClose={() => setAction(null)}
        />
      ) : null}
    </section>
  )
}
