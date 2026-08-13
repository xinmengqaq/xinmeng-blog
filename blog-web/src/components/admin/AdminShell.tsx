import { useEffect, type ReactNode } from 'react'

import { useAdminAuthStore } from '@/store/auth'

import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'
import './admin.css'

type AdminShellProps = {
  children: ReactNode
}

export const AdminShell = ({ children }: AdminShellProps) => {
  const currentUser = useAdminAuthStore((state) => state.currentUser)

  useEffect(() => {
    document.documentElement.classList.add('admin-shell-active')
    document.body.classList.add('admin-shell-active')
    return () => {
      document.documentElement.classList.remove('admin-shell-active')
      document.body.classList.remove('admin-shell-active')
    }
  }, [])

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-shell__main">
        <AdminTopbar currentUser={currentUser} />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}
