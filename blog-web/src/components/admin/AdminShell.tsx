import type { ReactNode } from 'react'

import { useAuthStore } from '@/store/auth'

import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'
import './admin.css'

type AdminShellProps = {
  children: ReactNode
}

export const AdminShell = ({ children }: AdminShellProps) => {
  const currentUser = useAuthStore((state) => state.currentUser)

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
