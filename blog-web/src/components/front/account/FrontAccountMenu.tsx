import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ChevronDown, LogIn, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Button, Toast } from '@/components/ui'
import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { useUserLogoutMutation } from '@/queries/userAuth'
import { useUserAuthStore } from '@/store/userAuth'
import { toApiError } from '@/utils/request'

import { FrontAccountModal } from './FrontAccountModal'
import './frontAccountMenu.css'

gsap.registerPlugin(useGSAP)

type FrontAccountMenuProps = {
  open: boolean
  mobile: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: () => void
}

export const FrontAccountMenu = ({
  open,
  mobile,
  onOpenChange,
  onNavigate,
}: FrontAccountMenuProps) => {
  const currentUser = useUserAuthStore((state) => state.currentUser)
  const isAuthenticated = useUserAuthStore((state) => state.isAuthenticated)
  const logout = useUserLogoutMutation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { reducedMotion } = useFrontMotionPreference()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [rendered, setRendered] = useState(open)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)

  useEffect(() => {
    if (open) setRendered(true)
  }, [open])

  useEffect(() => setAvatarFailed(false), [currentUser?.avatar])

  useGSAP(
    () => {
      if (mobile || !rendered || !menuRef.current) return
      if (reducedMotion) {
        gsap.set(menuRef.current, {
          autoAlpha: open ? 1 : 0,
          clearProps: 'transform',
        })
        if (!open) setRendered(false)
        return
      }

      gsap.fromTo(
        menuRef.current,
        open
          ? { autoAlpha: 0, y: -6, scale: 0.98 }
          : { autoAlpha: 1, y: 0, scale: 1 },
        open
          ? {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.18,
              ease: 'power2.out',
              overwrite: 'auto',
            }
          : {
              autoAlpha: 0,
              y: -4,
              scale: 0.99,
              duration: 0.12,
              ease: 'power1.in',
              overwrite: 'auto',
              onComplete: () => setRendered(false),
            },
      )
    },
    {
      scope: rootRef,
      dependencies: [mobile, open, reducedMotion, rendered],
      revertOnUpdate: true,
    },
  )

  useEffect(() => {
    if (!open || mobile) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [mobile, onOpenChange, open])

  useEffect(() => {
    if (!open || mobile) return
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onOpenChange(false)
      requestAnimationFrame(() => triggerRef.current?.focus())
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [mobile, onOpenChange, open])

  const confirmLogout = async () => {
    try {
      const result = await logout.mutateAsync({ pathname })
      setConfirmingLogout(false)
      onOpenChange(false)
      onNavigate()
      navigate(result.to, { replace: result.replace })
    } catch {
      // Mutation state keeps the confirmation open for retry.
    }
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <Link
        className={mobile ? 'front-account-mobile-link' : 'front-account-login'}
        onClick={onNavigate}
        to="/login"
      >
        <LogIn aria-hidden="true" />
        登录
      </Link>
    )
  }

  const avatar =
    currentUser.avatar && !avatarFailed ? (
      <img
        alt={`${currentUser.nickname}的头像`}
        onError={() => setAvatarFailed(true)}
        src={currentUser.avatar}
      />
    ) : (
      <UserRound aria-hidden="true" />
    )

  if (mobile) {
    return (
      <div className="front-account-mobile">
        <div
          className="front-account-mobile__identity"
          title={currentUser.nickname}
        >
          <span className="front-account-avatar">{avatar}</span>
          <strong>{currentUser.nickname}</strong>
        </div>
        <Link
          className="front-account-mobile-link"
          onClick={onNavigate}
          to="/profile"
        >
          <UserRound />
          个人资料
        </Link>
        <button
          className="front-account-mobile-link is-danger"
          onClick={() => setConfirmingLogout(true)}
          type="button"
        >
          <LogOut />
          退出登录
        </button>
        <LogoutConfirm
          error={logout.error}
          loading={logout.isPending}
          onCancel={() => setConfirmingLogout(false)}
          onConfirm={() => void confirmLogout()}
          open={confirmingLogout}
        />
      </div>
    )
  }

  return (
    <div className="front-account" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="front-account__trigger"
        onClick={() => onOpenChange(!open)}
        ref={triggerRef}
        title={currentUser.nickname}
        type="button"
      >
        <span className="front-account-avatar">{avatar}</span>
        <span className="front-account__nickname">{currentUser.nickname}</span>
        <ChevronDown aria-hidden="true" className={open ? 'is-open' : ''} />
      </button>
      {rendered ? (
        <div
          aria-label="用户菜单"
          className="front-account__menu"
          ref={menuRef}
          role="menu"
        >
          <Link onClick={onNavigate} role="menuitem" to="/profile">
            <UserRound />
            个人资料
          </Link>
          <button
            className="is-danger"
            onClick={() => {
              onOpenChange(false)
              setConfirmingLogout(true)
            }}
            role="menuitem"
            type="button"
          >
            <LogOut />
            退出登录
          </button>
        </div>
      ) : null}
      <LogoutConfirm
        error={logout.error}
        loading={logout.isPending}
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={() => void confirmLogout()}
        open={confirmingLogout}
      />
    </div>
  )
}

type LogoutConfirmProps = {
  open: boolean
  loading: boolean
  error: unknown
  onCancel: () => void
  onConfirm: () => void
}

const LogoutConfirm = ({
  open,
  loading,
  error,
  onCancel,
  onConfirm,
}: LogoutConfirmProps) => (
  <>
    <Toast
      message={error ? toApiError(error).message : null}
      signal={error}
      type="error"
    />
    <FrontAccountModal
      footer={
        <>
          <Button disabled={loading} onClick={onCancel} variant="secondary">
            取消
          </Button>
          <Button loading={loading} onClick={onConfirm} variant="danger">
            确认退出
          </Button>
        </>
      }
      locked={loading}
      onRequestClose={onCancel}
      open={open}
      title="退出登录？"
    >
      <p className="account-dialog-copy">
        退出后需要重新登录才能管理个人资料。
      </p>
    </FrontAccountModal>
  </>
)
