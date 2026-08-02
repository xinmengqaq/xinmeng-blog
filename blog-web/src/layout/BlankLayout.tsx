import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'

import { loadNotoSansSc } from '@/utils/loadNotoSansSc'

export const BlankLayout = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname.startsWith('/admin')) void loadNotoSansSc()
  }, [pathname])

  return (
    <div className="app-shell app-shell--blank">
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
