import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button, ConfirmDialog } from '@/components/ui'
import { useLogoutMutation } from '@/queries/auth'
import type { CurrentUser } from '@/types/auth'

import { AdminAvatar } from './AdminAvatar'
import './admin.css'

type AdminTopbarProps = {
  currentUser: CurrentUser | null
}

export const AdminTopbar = ({ currentUser }: AdminTopbarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const logoutMutation = useLogoutMutation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const pageTitle = location.pathname.startsWith('/admin/settings')
    ? '管理员设置'
    : location.pathname === '/admin/articles/categories'
      ? '文章分类管理'
      : location.pathname === '/admin/articles/tags'
        ? '文章标签管理'
        : location.pathname.startsWith('/admin/articles')
          ? '文章管理'
          : '后台首页'

  const handleConfirmLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } catch {
      // 退出接口失败也不能阻止本地登录态清理。
    } finally {
      setConfirmOpen(false)
      navigate('/admin/login', { replace: true })
    }
  }

  return (
    <header className="admin-topbar">
      <span className="admin-topbar__context">{pageTitle}</span>
      <div className="admin-topbar__actions">
        <div className="admin-topbar__user">
          <AdminAvatar
            label="当前管理员头像"
            size="sm"
            src={currentUser?.avatar}
          />
          <span>{currentUser ? currentUser.name : '资料加载中'}</span>
        </div>
        <Button onClick={() => setConfirmOpen(true)} size="sm" variant="ghost">
          退出登录
        </Button>
      </div>
      <ConfirmDialog
        danger
        loading={logoutMutation.isPending}
        open={confirmOpen}
        title="确认退出"
        description="退出后需要重新登录才能进入后台。"
        confirmText="确认退出"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </header>
  )
}
