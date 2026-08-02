import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import { AdminShell } from '@/components/admin'
import { loadNotoSansSc } from '@/utils/loadNotoSansSc'

export const AdminLayout = () => {
  useEffect(() => {
    void loadNotoSansSc()
  }, [])

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}
