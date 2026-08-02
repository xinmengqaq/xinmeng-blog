import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/store/auth'
import { getAuthRedirect } from './guardUtils'

type GuardProps = {
  requiresAuth?: boolean
  guestOnly?: boolean
}

export const RouteGuard = ({ requiresAuth, guestOnly }: GuardProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()
  const redirectTo = getAuthRedirect({
    isAuthenticated,
    requiresAuth,
    guestOnly,
    pathname: location.pathname,
  })

  if (redirectTo) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return <Outlet />
}
