export type AuthRedirectInput = {
  isAuthenticated: boolean
  pathname: string
  requiresAuth?: boolean
  guestOnly?: boolean
}

export const getAuthRedirect = ({
  isAuthenticated,
  requiresAuth,
  guestOnly,
}: AuthRedirectInput): string | null => {
  if (requiresAuth && !isAuthenticated) {
    return '/admin/login'
  }

  if (guestOnly && isAuthenticated) {
    return '/admin'
  }

  return null
}
