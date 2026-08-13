import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useUserProfileQuery } from '@/queries/userProfile'
import { useAdminAuthStore } from '@/store/auth'
import { useUserAuthStore } from '@/store/userAuth'
import { isApiError } from '@/utils/request'
import {
  getAdminAuthRedirect,
  getUserGuestRedirect,
  recordUserLoginRedirect,
} from './guardUtils'

type AdminGuardProps = {
  requiresAuth?: boolean
  guestOnly?: boolean
}

export const AdminRouteGuard = ({
  requiresAuth,
  guestOnly,
}: AdminGuardProps) => {
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated)
  const location = useLocation()
  const redirectTo = getAdminAuthRedirect({
    isAuthenticated,
    requiresAuth,
    guestOnly,
    pathname: location.pathname,
  })

  return redirectTo ? (
    <Navigate to={redirectTo} replace state={{ from: location }} />
  ) : (
    <Outlet />
  )
}

export const UserRouteGuard = () => {
  const token = useUserAuthStore((state) => state.token)
  const location = useLocation()
  const profileQuery = useUserProfileQuery()

  if (!token) {
    const expired =
      isApiError(profileQuery.error) && profileQuery.error.code === '401'
    recordUserLoginRedirect(
      `${location.pathname}${location.search}${location.hash}`,
      expired ? '登录已失效，请重新登录' : null,
    )
    return <Navigate to="/login" replace />
  }

  if (profileQuery.isPending) {
    return <p role="status">资料加载中</p>
  }

  if (profileQuery.isError) {
    if (isApiError(profileQuery.error) && profileQuery.error.code === '401') {
      recordUserLoginRedirect(
        `${location.pathname}${location.search}${location.hash}`,
        '登录已失效，请重新登录',
      )
      return <Navigate to="/login" replace />
    }

    return <p role="alert">资料加载失败，请重试</p>
  }

  return <Outlet />
}

export const UserGuestRoute = () => {
  const isAuthenticated = useUserAuthStore((state) => state.isAuthenticated)
  const location = useLocation()
  const returnTo = (location.state as { from?: unknown } | null)?.from
  const allowAuthenticatedForgotPassword =
    location.pathname === '/forgot-password' &&
    (location.state as { fromProfile?: unknown } | null)?.fromProfile === true
  const redirectTo = getUserGuestRedirect(
    isAuthenticated,
    returnTo,
    allowAuthenticatedForgotPassword,
  )

  return redirectTo ? <Navigate to={redirectTo} replace /> : <Outlet />
}
