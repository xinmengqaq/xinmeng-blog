import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'

import { loadNotoSansSc } from '@/utils/loadNotoSansSc'

export const BlankLayout = () => {
  const { pathname } = useLocation()
  const isAccountGuest = ['/login', '/register', '/forgot-password'].includes(
    pathname,
  )

  useEffect(() => {
    if (pathname.startsWith('/admin')) void loadNotoSansSc()
  }, [pathname])

  return (
    <div
      className={`app-shell app-shell--blank${isAccountGuest ? ' app-shell--account-guest' : ''}`}
    >
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
